'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CombinedTransaction } from '@/types';
import { Pencil, Trash2 } from 'lucide-react';
import TambahTransaksiModal from '../../../components/TambahTransaksiModal';
import EditTransaksiModal from '../../../components/EditTransaksiModal';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';
import toast from 'react-hot-toast';

export default function TransactionPage() {
    const [transactions, setTransactions] = useState<CombinedTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<CombinedTransaction | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [date, setDate] = useState('');


    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const { data: pemasukanData, error: pemasukanError } = await supabase.from('Transaction').select('*');
            const { data: pengeluaranData, error: pengeluaranError } = await supabase.from('Expense').select('*');

            if (pemasukanError || pengeluaranError) throw pemasukanError || pengeluaranError;

            const combined: CombinedTransaction[] = [
                ...(pemasukanData || []).map((tx) => ({
                    ...tx,
                    isExpense: false,
                    transactionType: 'PEMASUKAN', // ✅ tambahkan ini
                })),
                ...(pengeluaranData || []).map((exp) => ({
                    ...exp,
                    isExpense: true,
                    transactionType: 'PENGELUARAN', // ✅ tambahkan ini juga
                })),
            ];

            setTransactions(combined);
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
            toast.error('Gagal memuat data transaksi');
        } finally {
            setLoading(false);
        }
    };

    const handleTambahTransaksi = async (data: any) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (!data.date || !data.category) {
                toast.error('Tanggal dan kategori wajib diisi!');
                return;
            }

            const tableName = data.transactionType === 'PEMASUKAN' ? 'Transaction' : 'Expense';

            // ✅ Cek apakah data sudah ada
            const { data: existing, error: checkError } = await supabase
                .from(tableName)
                .select('id')
                .eq('date', data.date)
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

            // ✅ Insert jika tidak ada duplikat
            if (data.transactionType === 'PEMASUKAN') {
                const { error } = await supabase.from('Transaction').insert({
                    date: data.date,
                    category: data.category,
                    roomSold: data.roomSold || 0,
                    extraBed: data.extraBed || 0,
                    addPerson: data.addPerson || 0,
                    otherRoom: data.otherRoom || 0,
                    taxi: data.taxi || 0,
                    boatRental: data.boatRental || 0,
                    ticketBtmSg: data.ticketBtmSg || 0,
                    beverage: data.beverage || 0,
                    seaPantry: data.seaPantry || 0,
                    breakfast: data.breakfast || 0,
                    addBreakfast: data.addBreakfast || 0,
                    otherFb: data.otherFb || 0,
                    discount: data.discount || 0,
                    hotelActivity: data.hotelActivity || 0,
                    kikiMassage: data.kikiMassage || 0,
                    wowExp: data.wowExp || 0,
                    totalFbRevenue: data.totalFbRevenue || 0,
                    roomRevenue: data.roomRevenue || 0,
                    updatedAt: new Date().toISOString(),
                });
                if (error) throw error;
            }
            else {
                const { error } = await supabase.from('Expense').insert({
                    date: data.date,
                    category: data.category,
                    amount: data.amount,
                    note: data.note,
                    updatedAt: new Date().toISOString(),
                });
                if (error) throw error;
            }

            toast.success('Transaksi berhasil ditambahkan!');
            setIsModalOpen(false);
            fetchTransactions();
        } catch (error) {
            console.error('Gagal menambahkan transaksi:', error);
            toast.error('Gagal menambahkan transaksi.');
        }
    };


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
            fetchTransactions();
        } catch (err) {
            toast.error('Gagal menghapus transaksi');
        }
    };
    const handleEditSubmit = async (data: CombinedTransaction) => {
        try {
            if (data.isExpense) {
                // Hanya kirim field valid untuk Expense
                const { id, date, category, amount, note } = data;
                await supabase.from('Expense').update({
                    date,
                    category,
                    amount,
                    note,
                    updatedAt: new Date().toISOString(),
                }).eq('id', id);
            } else {
                // Hanya kirim field valid untuk Transaction
                const {
                    id, date, category, roomSold, extraBed, addPerson,
                    otherRoom, taxi, boatRental, ticketBtmSg,
                    beverage, seaPantry, breakfast, addBreakfast, otherFb, discount,
                    hotelActivity, kikiMassage, wowExp, totalFbRevenue, roomRevenue,
                } = data;

                await supabase.from('Transaction').update({
                    date,
                    category,
                    roomSold,
                    extraBed,
                    addPerson,
                    otherRoom,
                    taxi,
                    boatRental,
                    ticketBtmSg,
                    beverage,
                    seaPantry,
                    breakfast,
                    addBreakfast,
                    otherFb,
                    discount,
                    hotelActivity,
                    kikiMassage,
                    wowExp,
                    totalFbRevenue,
                    roomRevenue,
                    updatedAt: new Date().toISOString(),
                }).eq('id', id);
            }

            toast.success('Transaksi berhasil diupdate');
            fetchTransactions();
            setIsEditModalOpen(false);
            setSelectedTransaction(null);
        } catch (error) {
            toast.error('Gagal mengupdate transaksi');
            console.error(error);
        }
    };
    const calculateNominal = (tx: CombinedTransaction) => {
        if (tx.category === 'ROOM_REVENUE') {
            return (
                (tx.roomRevenue || 0) +
                (tx.extraBed || 0) +
                (tx.addPerson || 0) +
                (tx.otherRoom || 0) +
                (tx.taxi || 0) +
                (tx.boatRental || 0) +
                (tx.ticketBtmSg || 0)
            );
        }
        if (tx.category === 'ACTIVITY_REVENUE') {
            return (
                (tx.hotelActivity || 0) +
                (tx.kikiMassage || 0) +
                (tx.wowExp || 0)
            );
        }
        if (tx.category === 'FB_REVENUE') {
            return tx.totalFbRevenue || 0;
        }
        return 0;
    };


    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <h1 className="text-2xl font-bold mb-4">Transaksi</h1>
            <button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mb-4"
            >
                + Tambah Transaksi
            </button>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="space-y-10">
                    <div>
                        <h2 className="text-xl font-semibold text-green-600 mb-2">📥 Pemasukan</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full table-fixed border text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="border px-4 py-2 w-[140px]">Tanggal</th>
                                        <th className="border px-4 py-2 w-[280px]">Kategori</th>
                                        <th className="border px-4 py-2 w-[280px] text-right">Nominal Pemasukan</th>
                                        <th className="border px-4 py-2 w-[100px] text-center">Opsi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.filter(tx => !tx.isExpense).map((tx) => (
                                        <tr key={tx.id} className="hover:bg-gray-50">
                                            <td className="border px-4 py-2">{new Date(tx.date).toLocaleDateString()}</td>
                                            <td className="border px-4 py-2">{tx.category?.replace(/_/g, ' ') || '-'}</td>
                                            <td className="border px-4 py-2 text-right">
                                                Rp {calculateNominal(tx).toLocaleString('id-ID')}
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
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold text-red-600 mb-2">📤 Pengeluaran</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full table-fixed border text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="border px-4 py-2 w-[140px]">Tanggal</th>
                                        <th className="border px-4 py-2 w-[280px]">Kategori</th>
                                        <th className="border px-4 py-2 w-[280px] text-right">Nominal Pengeluaran</th>
                                        <th className="border px-4 py-2 w-[100px] text-center">Opsi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.filter(tx => tx.isExpense).map((tx) => (
                                        <tr key={tx.id} className="hover:bg-gray-50">
                                            <td className="border px-4 py-2">{new Date(tx.date).toLocaleDateString()}</td>
                                            <td className="border px-4 py-2">{tx.category?.replace(/_/g, ' ') || '-'}</td>
                                            <td className="border px-4 py-2 text-right">
                                                Rp {(tx as any).amount?.toLocaleString('id-ID') || '0'}
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
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

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
                    initialData={selectedTransaction} // ✅ ganti dari `transaction`
                    onSubmit={handleEditSubmit}       // ✅ pastikan handler ini ada
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
