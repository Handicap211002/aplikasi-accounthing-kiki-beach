'use client';

import { useEffect, useMemo, useState } from 'react';
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
  // rentang hari lokal (browser setempat)
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
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTransactions = async (dateStr: string, type: FilterType, category: FilterCategory) => {
    setLoading(true);
    try {
      const { startISO, endISO } = dayRangeISO(dateStr);

      const shouldGetPemasukan = type === 'ALL' || type === 'PEMASUKAN';
      const shouldGetPengeluaran = type === 'ALL' || type === 'PENGELUARAN';

      let pemasukanData: any[] = [];
      let pengeluaranData: any[] = [];
      let pemasukanError: any = null;
      let pengeluaranError: any = null;

      if (shouldGetPemasukan) {
        let q = supabase.from('Transaction').select('*').gte('date', startISO).lt('date', endISO);
        if (category !== 'ALL') q = q.eq('category', category);
        const res = await q;
        pemasukanData = res.data ?? [];
        pemasukanError = res.error;
      }

      if (shouldGetPengeluaran) {
        let q2 = supabase.from('Expense').select('*').gte('date', startISO).lt('date', endISO);
        if (category !== 'ALL') q2 = q2.eq('category', category);
        const res2 = await q2;
        pengeluaranData = res2.data ?? [];
        pengeluaranError = res2.error;
      }

      if (pemasukanError || pengeluaranError) throw (pemasukanError || pengeluaranError);

      const combined: CombinedTransaction[] = [
        ...pemasukanData.map((tx: any) => ({ ...tx, isExpense: false, transactionType: 'PEMASUKAN' })),
        ...pengeluaranData.map((exp: any) => ({ ...exp, isExpense: true, transactionType: 'PENGELUARAN' })),
      ].sort((a, b) => +new Date(b.date as any) - +new Date(a.date as any));

      setTransactions(combined);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      toast.error('Gagal memuat data transaksi');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => fetchTransactions(filterDate, filterType, filterCategory);

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
          // FB
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
      return n(tx.roomRevenue) + n(tx.extraBed) + n(tx.addPerson) + n(tx.otherRoom) + n(tx.taxi) + n(tx.boatRental) + n(tx.ticketBtmSg);
    }
    if (tx.category === 'ACTIVITY_REVENUE') {
      return n(tx.hotelActivity) + n(tx.kikiMassage) + n(tx.wowExp);
    }
    if (tx.category === 'FB_REVENUE') {
      return n(tx.totalFbRevenue);
    }
    return 0;
  };

  const pemasukan = useMemo(() => transactions.filter(tx => !tx.isExpense), [transactions]);
  const pengeluaran = useMemo(() => transactions.filter(tx => tx.isExpense), [transactions]);

  return (
    <div className="min-h-screen p-4 sm:p-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold min-w-0">Transaksi</h1>
        <div className="sm:ml-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"
          >
            + Tambah Transaksi
          </button>
        </div>
      </header>

      {/* Filter Bar */}
      <section className="mt-4 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 min-w-0">
          {/* Tanggal */}
          <div className="flex items-center gap-2 md:w-1/3 min-w-0">
            <label className="text-sm text-slate-600 w-20 shrink-0">Tanggal</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full bg-white dark:bg-gray-900"
            />
          </div>

          {/* Jenis */}
          <div className="flex items-center gap-2 md:w-1/3 min-w-0">
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
          <div className="flex items-center gap-2 md:w-1/3 min-w-0">
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

        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <button
            onClick={handleSearch}
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm"
          >
            <Search size={16} /> Cari
          </button>
          <button
            onClick={resetToToday}
            className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-100 px-3 py-2 rounded-lg text-sm"
          >
            <RotateCcw size={16} /> Hari ini
          </button>
        </div>
      </section>

      {/* Loading */}
      {loading && (
        <div aria-live="polite" className="mt-6 text-slate-600">Loading…</div>
      )}

      {!loading && (
        <div className="space-y-10 mt-6">
          {/* ====== PEMASUKAN ====== */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-green-600 mb-2">📥 Pemasukan</h2>

            {/* Mobile cards */}
            <div className="grid gap-2 sm:hidden">
              {pemasukan.length === 0 && (
                <div className="text-center text-slate-500 bg-white dark:bg-gray-800 rounded-lg py-4">Tidak ada data.</div>
              )}
              {pemasukan.map((tx) => (
                <article key={tx.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>{new Date(tx.date).toLocaleDateString('id-ID')}</span>
                    <span className="font-medium">{tx.category?.replace(/_/g, ' ') || '-'}</span>
                  </div>
                  <div className="mt-1 text-base font-semibold">{idr(calculateNominal(tx))}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      aria-label="Edit transaksi"
                      onClick={() => handleEdit(tx)}
                      className="inline-flex items-center gap-1 text-yellow-700 hover:text-yellow-800 px-2 py-1 rounded"
                    >
                      <Pencil size={16} /> Edit
                    </button>
                    <button
                      aria-label="Hapus transaksi"
                      onClick={() => handleDelete(tx)}
                      className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 px-2 py-1 rounded"
                    >
                      <Trash2 size={16} /> Hapus
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {/* Desktop table */}
            <div className="overflow-x-auto overscroll-x-contain hidden sm:block rounded-lg" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="min-w-[700px] md:min-w-full border text-[12px] sm:text-sm bg-white dark:bg-gray-800">
                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
                  <tr>
                    <th className="border px-3 py-2 whitespace-nowrap text-left">Tanggal</th>
                    <th className="border px-3 py-2 whitespace-nowrap text-left">Kategori</th>
                    <th className="border px-3 py-2 whitespace-nowrap text-right">Nominal</th>
                    <th className="border px-3 py-2 whitespace-nowrap text-center w-px">Opsi</th>
                  </tr>
                </thead>
                <tbody>
                  {pemasukan.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-4 text-slate-500">Tidak ada data.</td></tr>
                  )}
                  {pemasukan.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="border px-3 py-2 whitespace-nowrap">{new Date(tx.date).toLocaleDateString('id-ID')}</td>
                      <td className="border px-3 py-2 whitespace-nowrap">{tx.category?.replace(/_/g, ' ') || '-'}</td>
                      <td className="border px-3 py-2 whitespace-nowrap text-right">{idr(calculateNominal(tx))}</td>
                      <td className="border px-2 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button aria-label="Edit transaksi" onClick={() => handleEdit(tx)} className="p-1 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/20">
                            <Pencil size={16} className="text-yellow-600" />
                          </button>
                          <button aria-label="Hapus transaksi" onClick={() => handleDelete(tx)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                            <Trash2 size={16} className="text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ====== PENGELUARAN ====== */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-red-600 mb-2">📤 Pengeluaran</h2>

            {/* Mobile cards */}
            <div className="grid gap-2 sm:hidden">
              {pengeluaran.length === 0 && (
                <div className="text-center text-slate-500 bg-white dark:bg-gray-800 rounded-lg py-4">Tidak ada data.</div>
              )}
              {pengeluaran.map((tx) => (
                <article key={tx.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>{new Date(tx.date).toLocaleDateString('id-ID')}</span>
                    <span className="font-medium">{tx.category?.replace(/_/g, ' ') || '-'}</span>
                  </div>
                  <div className="mt-1 text-base font-semibold">{idr((tx as any).amount)}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      aria-label="Edit transaksi"
                      onClick={() => handleEdit(tx)}
                      className="inline-flex items-center gap-1 text-yellow-700 hover:text-yellow-800 px-2 py-1 rounded"
                    >
                      <Pencil size={16} /> Edit
                    </button>
                    <button
                      aria-label="Hapus transaksi"
                      onClick={() => handleDelete(tx)}
                      className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 px-2 py-1 rounded"
                    >
                      <Trash2 size={16} /> Hapus
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {/* Desktop table */}
            <div className="overflow-x-auto overscroll-x-contain hidden sm:block rounded-lg" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="min-w-[700px] md:min-w-full border text-[12px] sm:text-sm bg-white dark:bg-gray-800">
                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
                  <tr>
                    <th className="border px-3 py-2 whitespace-nowrap text-left">Tanggal</th>
                    <th className="border px-3 py-2 whitespace-nowrap text-left">Kategori</th>
                    <th className="border px-3 py-2 whitespace-nowrap text-right">Nominal</th>
                    <th className="border px-3 py-2 whitespace-nowrap text-center w-px">Opsi</th>
                  </tr>
                </thead>
                <tbody>
                  {pengeluaran.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-4 text-slate-500">Tidak ada data.</td></tr>
                  )}
                  {pengeluaran.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="border px-3 py-2 whitespace-nowrap">{new Date(tx.date).toLocaleDateString('id-ID')}</td>
                      <td className="border px-3 py-2 whitespace-nowrap">{tx.category?.replace(/_/g, ' ') || '-'}</td>
                      <td className="border px-3 py-2 whitespace-nowrap text-right">{idr((tx as any).amount)}</td>
                      <td className="border px-2 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button aria-label="Edit transaksi" onClick={() => handleEdit(tx)} className="p-1 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/20">
                            <Pencil size={16} className="text-yellow-600" />
                          </button>
                          <button aria-label="Hapus transaksi" onClick={() => handleDelete(tx)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                            <Trash2 size={16} className="text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
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