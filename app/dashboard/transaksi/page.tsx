'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CombinedTransaction } from '@/types';
import { Pencil, Trash2, Search, RotateCcw } from 'lucide-react';
import TambahTransaksiModal from '../../../components/TambahTransaksiModal';
import EditTransaksiModal from '../../../components/EditTransaksiModal';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';
import toast from 'react-hot-toast';

// ---------- Helpers ----------
const n = (v: any) => (v === null || v === undefined || v === '' ? 0 : Number(v));
const idr = (v: any) => `Rp ${Number(v || 0).toLocaleString('id-ID')}`;
const formatDateInput = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const dayRangeISO = (dateStr: string) => {
  // rentang hari lokal Asia/Jakarta (Date() sudah pakai lokal environment browser)
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
};

const CATEGORIES = ['ROOM_REVENUE', 'FB_REVENUE', 'ACTIVITY_REVENUE'] as const;
type FilterType = 'ALL' | 'PEMASUKAN' | 'PENGELUARAN';
type FilterCategory = 'ALL' | typeof CATEGORIES[number];

export default function TransactionPage() {
  const [transactions, setTransactions] = useState<CombinedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CombinedTransaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---------- Filter State (default: hari ini) ----------
  const [filterDate, setFilterDate] = useState<string>(formatDateInput(new Date()));
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('ALL');

  // load awal: hari ini
  useEffect(() => {
    handleSearch(); // tampilkan data hari ini
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

const fetchTransactions = async (dateStr: string, type: FilterType, category: FilterCategory) => {
  setLoading(true);
  try {
    const { startISO, endISO } = dayRangeISO(dateStr);

    const shouldGetPemasukan = type === 'ALL' || type === 'PEMASUKAN';
    const shouldGetPengeluaran = type === 'ALL' || type === 'PENGELUARAN';

    // siapkan penampung yang sudah "bersih tipe"-nya
    let pemasukanData: any[] = [];
    let pengeluaranData: any[] = [];
    let pemasukanError: any = null;
    let pengeluaranError: any = null;

    if (shouldGetPemasukan) {
      let q = supabase
        .from('Transaction')
        .select('*')
        .gte('date', startISO)
        .lt('date', endISO);
      if (category !== 'ALL') q = q.eq('category', category);

      const res = await q;                 // res: { data: any[] | null, error: PostgrestError | null, ... }
      pemasukanData = res.data ?? [];      // 🔧 ubah null -> []
      pemasukanError = res.error;
    }

    if (shouldGetPengeluaran) {
      let q2 = supabase
        .from('Expense')
        .select('*')
        .gte('date', startISO)
        .lt('date', endISO);
      if (category !== 'ALL') q2 = q2.eq('category', category);

      const res2 = await q2;
      pengeluaranData = res2.data ?? [];   // 🔧 ubah null -> []
      pengeluaranError = res2.error;
    }

    if (pemasukanError || pengeluaranError) {
      throw (pemasukanError || pengeluaranError);
    }

    const combined: CombinedTransaction[] = [
      ...pemasukanData.map((tx: any) => ({
        ...tx,
        isExpense: false,
        transactionType: 'PEMASUKAN',
      })),
      ...pengeluaranData.map((exp: any) => ({
        ...exp,
        isExpense: true,
        transactionType: 'PENGELUARAN',
      })),
    ].sort((a, b) => +new Date(b.date as any) - +new Date(a.date as any)); // terbaru dulu

    setTransactions(combined);
  } catch (err) {
    console.error('Failed to fetch transactions:', err);
    toast.error('Gagal memuat data transaksi');
  } finally {
    setLoading(false);
  }
};

  const handleSearch = () => {
    fetchTransactions(filterDate, filterType, filterCategory);
  };

  const resetToToday = () => {
    const today = formatDateInput(new Date());
    setFilterDate(today);
    setFilterType('ALL');
    setFilterCategory('ALL');
    fetchTransactions(today, 'ALL', 'ALL');
  };

  // ---------- Tambah ----------
  const handleTambahTransaksi = async (data: any) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (!data.date || !data.category) {
        toast.error('Tanggal dan kategori wajib diisi!');
        return;
      }

      const tableName = data.transactionType === 'PEMASUKAN' ? 'Transaction' : 'Expense';

      // cek duplikat per hari
      const { startISO, endISO } = dayRangeISO(data.date);
      const { data: existing, error: checkError } = await supabase
        .from(tableName)
        .select('id')
        .gte('date', startISO)
        .lt('date', endISO)
        .eq('category', data.category)
        .maybeSingle();

      if (checkError) {
        console.error('Gagal cek data existing:', checkError);
        toast.error('Terjadi kesalahan saat cek data duplikat');
        return;
      }
      if (existing) {
        toast.error(`Transaksi kategori "${data.category.replace(/_/g, ' ')}" sudah ada untuk tanggal ini.`);
        return;
      }

      // insert
      if (data.transactionType === 'PEMASUKAN') {
        const autoTotalFB =
          n(data.foodAlacarte) + n(data.beverage) + n(data.seaPantry) +
          n(data.breakfast) + n(data.addBreakfast) + n(data.otherFb) - n(data.discount);

        const { error } = await supabase.from('Transaction').insert({
          date: data.date,
          category: data.category,
          // ROOM
          roomSold: n(data.roomSold),
          personPaxRoom: n(data.personPaxRoom),
          roomRevenue: n(data.roomRevenue),
          extraBed: n(data.extraBed),
          addPerson: n(data.addPerson),
          otherRoom: n(data.otherRoom),
          taxi: n(data.taxi),
          boatRental: n(data.boatRental),
          ticketBtmSg: n(data.ticketBtmSg),
          // FB (pakai autoTotalFB supaya konsisten)
          foodAlacarte: n(data.foodAlacarte),
          beverage: n(data.beverage),
          seaPantry: n(data.seaPantry),
          breakfast: n(data.breakfast),
          addBreakfast: n(data.addBreakfast),
          otherFb: n(data.otherFb),
          discount: n(data.discount),
          totalFbRevenue: n(data.totalFbRevenue ?? autoTotalFB),
          // ACTIVITY
          hotelActivity: n(data.hotelActivity),
          kikiMassage: n(data.kikiMassage),
          wowExp: n(data.wowExp),
          updatedAt: new Date().toISOString(),
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('Expense').insert({
          date: data.date,
          category: data.category,
          amount: n(data.amount),
          note: data.note,
          updatedAt: new Date().toISOString(),
        });
        if (error) throw error;
      }

      toast.success('Transaksi berhasil ditambahkan!');
      setIsModalOpen(false);
      // refresh tampilan sesuai filter aktif
      handleSearch();
    } catch (error) {
      console.error('Gagal menambahkan transaksi:', error);
      toast.error('Gagal menambahkan transaksi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- Edit/Delete ----------
  const handleEdit = (tx: CombinedTransaction) => {
    setSelectedTransaction(tx);
    setIsEditModalOpen(true);
  };

  const handleDelete = (tx: CombinedTransaction) => {
    setSelectedTransaction(tx);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedTransaction) return;
    try {
      const table = selectedTransaction.isExpense ? 'Expense' : 'Transaction';
      const { error } = await supabase.from(table).delete().eq('id', selectedTransaction.id);
      if (error) throw error;
      toast.success('Transaksi berhasil dihapus');
      setIsDeleteModalOpen(false);
      setSelectedTransaction(null);
      handleSearch();
    } catch (err) {
      toast.error('Gagal menghapus transaksi');
    }
  };

  const handleEditSubmit = async (data: CombinedTransaction) => {
    try {
      if (data.isExpense) {
        const { id, date, category, amount, note } = data;
        await supabase
          .from('Expense')
          .update({
            date,
            category,
            amount: n(amount),
            note,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', id);
      } else {
        const {
          id, date, category, roomSold, extraBed, addPerson, personPaxRoom,
          otherRoom, taxi, boatRental, ticketBtmSg, foodAlacarte,
          beverage, seaPantry, breakfast, addBreakfast, otherFb, discount,
          hotelActivity, kikiMassage, wowExp, totalFbRevenue, roomRevenue,
        } = data;

        const autoTotalFB =
          n(foodAlacarte) + n(beverage) + n(seaPantry) +
          n(breakfast) + n(addBreakfast) + n(otherFb) - n(discount);

        await supabase
          .from('Transaction')
          .update({
            date,
            category,
            roomSold: n(roomSold),
            personPaxRoom: n(personPaxRoom),
            roomRevenue: n(roomRevenue),
            extraBed: n(extraBed),
            addPerson: n(addPerson),
            otherRoom: n(otherRoom),
            taxi: n(taxi),
            boatRental: n(boatRental),
            ticketBtmSg: n(ticketBtmSg),
            foodAlacarte: n(foodAlacarte),
            beverage: n(beverage),
            seaPantry: n(seaPantry),
            breakfast: n(breakfast),
            addBreakfast: n(addBreakfast),
            otherFb: n(otherFb),
            discount: n(discount),
            totalFbRevenue: n(totalFbRevenue ?? autoTotalFB),
            hotelActivity: n(hotelActivity),
            kikiMassage: n(kikiMassage),
            wowExp: n(wowExp),
            updatedAt: new Date().toISOString(),
          })
          .eq('id', id);
      }

      toast.success('Transaksi berhasil diupdate');
      setIsEditModalOpen(false);
      setSelectedTransaction(null);
      handleSearch();
    } catch (error) {
      toast.error('Gagal mengupdate transaksi');
      console.error(error);
    }
  };

  // ---------- UI ----------
  const calculateNominal = (tx: CombinedTransaction) => {
    if (tx.category === 'ROOM_REVENUE') {
      return (
        n(tx.roomRevenue) +
        n(tx.extraBed) +
        n(tx.addPerson) +
        n(tx.otherRoom) +
        n(tx.taxi) +
        n(tx.boatRental) +
        n(tx.ticketBtmSg)
      );
    }
    if (tx.category === 'ACTIVITY_REVENUE') {
      return n(tx.hotelActivity) + n(tx.kikiMassage) + n(tx.wowExp);
    }
    if (tx.category === 'FB_REVENUE') {
      return n(tx.totalFbRevenue);
    }
    return 0;
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Transaksi</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded"
        >
          + Tambah Transaksi
        </button>
      </div>

      {/* Filter Bar */}
      <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Tanggal */}
          <div className="flex items-center gap-2 md:w-1/3">
            <label className="text-sm text-slate-600 w-20 shrink-0">Tanggal</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-900"
            />
          </div>

          {/* Jenis */}
          <div className="flex items-center gap-2 md:w-1/3">
            <label className="text-sm text-slate-600 w-20 shrink-0">Jenis</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="border rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-900"
            >
              <option value="ALL">Semua</option>
              <option value="PEMASUKAN">Pemasukan</option>
              <option value="PENGELUARAN">Pengeluaran</option>
            </select>
          </div>

          {/* Kategori */}
          <div className="flex items-center gap-2 md:w-1/3">
            <label className="text-sm text-slate-600 w-20 shrink-0">Kategori</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as FilterCategory)}
              className="border rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-900"
            >
              <option value="ALL">Semua</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSearch}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded"
          >
            <Search size={16} /> Cari
          </button>
          <button
            onClick={resetToToday}
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-100 px-3 py-2 rounded"
          >
            <RotateCcw size={16} /> Hari ini
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-6">Loading...</div>
      ) : (
        <div className="space-y-10 mt-6">
          {/* Pemasukan */}
          <div>
            <h2 className="text-xl font-semibold text-green-600 mb-2">📥 Pemasukan</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border text-sm bg-white dark:bg-gray-800">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="border px-4 py-2 whitespace-nowrap">Tanggal</th>
                    <th className="border px-4 py-2 whitespace-nowrap">Kategori</th>
                    <th className="border px-4 py-2 whitespace-nowrap text-right">Nominal</th>
                    <th className="border px-4 py-2 text-center">Opsi</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.filter(tx => !tx.isExpense).map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="border px-4 py-2">{new Date(tx.date).toLocaleDateString('id-ID')}</td>
                      <td className="border px-4 py-2">{tx.category?.replace(/_/g, ' ') || '-'}</td>
                      <td className="border px-4 py-2 text-right">
                        {idr(calculateNominal(tx))}
                      </td>
                      <td className="border px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEdit(tx)}>
                            <Pencil size={18} className="text-yellow-500 hover:text-yellow-600" />
                          </button>
                          <button onClick={() => handleDelete(tx)}>
                            <Trash2 size={18} className="text-red-500 hover:text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {transactions.filter(tx => !tx.isExpense).length === 0 && (
                    <tr><td colSpan={4} className="text-center py-4 text-slate-500">Tidak ada data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pengeluaran */}
          <div>
            <h2 className="text-xl font-semibold text-red-600 mb-2">📤 Pengeluaran</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border text-sm bg-white dark:bg-gray-800">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="border px-4 py-2 whitespace-nowrap">Tanggal</th>
                    <th className="border px-4 py-2 whitespace-nowrap">Kategori</th>
                    <th className="border px-4 py-2 whitespace-nowrap text-right">Nominal</th>
                    <th className="border px-4 py-2 text-center">Opsi</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.filter(tx => tx.isExpense).map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="border px-4 py-2">{new Date(tx.date).toLocaleDateString('id-ID')}</td>
                      <td className="border px-4 py-2">{tx.category?.replace(/_/g, ' ') || '-'}</td>
                      <td className="border px-4 py-2 text-right">
                        {idr((tx as any).amount)}
                      </td>
                      <td className="border px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEdit(tx)}>
                            <Pencil size={18} className="text-yellow-500 hover:text-yellow-600" />
                          </button>
                          <button onClick={() => handleDelete(tx)}>
                            <Trash2 size={18} className="text-red-500 hover:text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {transactions.filter(tx => tx.isExpense).length === 0 && (
                    <tr><td colSpan={4} className="text-center py-4 text-slate-500">Tidak ada data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <TambahTransaksiModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleTambahTransaksi}
      />
      {selectedTransaction && (
        <EditTransaksiModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTransaction(null);
          }}
          initialData={selectedTransaction}
          onSubmit={handleEditSubmit}
        />
      )}
      {selectedTransaction && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          message="Apakah kamu yakin ingin menghapus transaksi ini?"
        />
      )}
    </div>
  );
}
