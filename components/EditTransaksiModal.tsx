'use client';

import { useEffect, useState } from 'react';
import { Category, TransactionType, CombinedTransaction } from '@/types';

// Di luar EditTransaksiModal
const Field = ({
    name,
    label,
    value,
    onChange,
}: {
    name: string;
    label: string;
    value: string | number | undefined;
    onChange: (name: string, value: string) => void;
}) => (
    <div>
        <label className="block mb-1">{label}</label>
        <input
            type="number"
            className="w-full border px-3 py-2 rounded"
            value={value ?? ''}
            onChange={(e) => onChange(name, e.target.value)}
        />
    </div>
);


interface EditTransaksiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData: CombinedTransaction | null;
}

export default function EditTransaksiModal({
    isOpen,
    onClose,
    onSubmit,
    initialData,

}: EditTransaksiModalProps) {
    const [form, setForm] = useState<Partial<CombinedTransaction>>({});
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState<'success' | 'error' | ''>('');

    useEffect(() => {
        if (initialData) {
            const transactionType = initialData.isExpense
                ? TransactionType.PENGELUARAN
                : TransactionType.PEMASUKAN;

            setForm({
                ...initialData,
                transactionType,
            });
        }
    }, [initialData]);

    const handleChange = (field: string, value: any) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // Hitung otomatis totalFbRevenue ketika kategori FB_REVENUE
    useEffect(() => {
        if (form.category === Category.FB_REVENUE) {
            const beverage = Number(form.beverage) || 0;
            const seaPantry = Number(form.seaPantry) || 0;
            const breakfast = Number(form.breakfast) || 0;
            const addBreakfast = Number(form.addBreakfast) || 0;
            const otherFb = Number(form.otherFb) || 0;
            const discount = Number(form.discount) || 0;

            const total = beverage + seaPantry + breakfast + addBreakfast + otherFb - discount;

            setForm((prev) => ({
                ...prev,
                totalFbRevenue: total,
            }));
        }
    }, [
        form.beverage,
        form.seaPantry,
        form.breakfast,
        form.addBreakfast,
        form.otherFb,
        form.discount,
        form.category,
    ]);

    const renderCategoryFields = () => {
        switch (form.category) {
            case Category.ROOM_REVENUE:
                return (
                    <>
                        <Field name="roomSold" label="Room Sold" value={form.roomSold} onChange={handleChange} />
                        <Field name="personPaxRoom" label="Person/Pax Room" value={form.personPaxRoom} onChange={handleChange} />
                        <Field name="roomRevenue" label="Room Revenue" value={form.roomRevenue} onChange={handleChange} />
                        <Field name="extraBed" label="Extra Bed" value={form.extraBed} onChange={handleChange} />
                        <Field name="addPerson" label="Add Person" value={form.addPerson} onChange={handleChange} />
                        <Field name="otherRoom" label="Other Room" value={form.otherRoom} onChange={handleChange} />
                        <Field name="taxi" label="Taxi" value={form.taxi} onChange={handleChange} />
                        <Field name="boatRental" label="Boat Rental" value={form.boatRental} onChange={handleChange} />
                        <Field name="ticketBtmSg" label="Ticket BTM-SG" value={form.ticketBtmSg} onChange={handleChange} />
                    </>
                );
            case Category.FB_REVENUE:
                return (
                    <>
                        <Field name="beverage" label="Beverage" value={form.beverage} onChange={handleChange} />
                        <Field name="seaPantry" label="Sea Pantry" value={form.seaPantry} onChange={handleChange} />
                        <Field name="breakfast" label="Breakfast" value={form.breakfast} onChange={handleChange} />
                        <Field name="addBreakfast" label="Add B'fast" value={form.addBreakfast} onChange={handleChange} />
                        <Field name="otherFb" label="Other F&B" value={form.otherFb} onChange={handleChange} />
                        <Field name="discount" label="Discount" value={form.discount} onChange={handleChange} />
                    </>
                );
            case Category.ACTIVITY_REVENUE:
                return (
                    <>
                        <Field name="hotelActivity" label="Hotel Activity" value={form.hotelActivity} onChange={handleChange} />
                        <Field name="kikiMassage" label="Kiki Massage" value={form.kikiMassage} onChange={handleChange} />
                        <Field name="wowExp" label="Wow Experience" value={form.wowExp} onChange={handleChange} />
                    </>
                );
            default:
                return null;
        }
    };


    const handleSubmit = () => {
        if (!form.date || !form.category || !form.transactionType) {
            setAlertType('error');
            setAlertMessage('Mohon lengkapi semua field wajib');
            return;
        }

        try {
            onSubmit({ ...form });
            setAlertType('success');
            setAlertMessage('Transaksi berhasil diperbarui');

            setTimeout(() => {
                onClose();
                setAlertMessage('');
                setAlertType('');
            }, 1500);
        } catch (error) {
            console.error('Gagal menyimpan:', error);
            setAlertType('error');
            setAlertMessage('Gagal menyimpan perubahan');
        }
    };

    if (!isOpen || !form) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 px-4">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-4 shadow-lg sm:p-6">
                {alertMessage && (
                    <div
                        className={`mb-4 px-4 py-2 rounded text-white ${alertType === 'success' ? 'bg-green-500' : 'bg-red-500'
                            }`}
                    >
                        {alertMessage}
                    </div>
                )}
                <h2 className="text-xl font-semibold mb-4">
                    {form.transactionType === 'PEMASUKAN' ? 'Edit Pemasukan' : 'Edit Pengeluaran'}
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block mb-1">Tanggal</label>
                        <input
                            type="date"
                            className="w-full border px-3 py-2 rounded"
                            value={form.date ? new Date(form.date).toISOString().split('T')[0] : ''}
                            onChange={(e) => handleChange('date', e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block mb-1">Kategori</label>
                        <select
                            className="w-full border px-3 py-2 rounded"
                            value={form.category ?? ''}
                            onChange={(e) => handleChange('category', e.target.value as Category)}
                            disabled
                        >
                            <option value="">-- Pilih Kategori --</option>
                            {Object.values(Category).map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat.replace(/_/g, ' ')}
                                </option>
                            ))}
                        </select>
                    </div>

                    {form.transactionType === 'PENGELUARAN' ? (
                        <>
                            <Field
                                name="amount"
                                label="Nominal Pengeluaran"
                                value={form.amount}
                                onChange={handleChange}
                            />
                            <div>
                                <label className="block mb-1">Catatan</label>
                                <textarea
                                    className="w-full border px-3 py-2 rounded"
                                    value={form.note ?? ''}
                                    onChange={(e) => handleChange('note', e.target.value)}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            {renderCategoryFields()}

                            {form.category === Category.FB_REVENUE && (
                                <div>
                                    <label className="block mb-1">Total F&B Revenue</label>
                                    <input
                                        type="number"
                                        className="w-full border px-3 py-2 rounded bg-gray-100"
                                        value={form.totalFbRevenue ?? 0}
                                        readOnly
                                    />
                                </div>
                            )}

                            {form.category === Category.ROOM_REVENUE && (
                                <Field
                                    name="roomRevenue"
                                    label="Room Revenue"
                                    value={form.roomRevenue}
                                    onChange={handleChange}
                                />
                            )}
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded"
                    >
                        Simpan
                    </button>
                </div>
            </div>
        </div>
    );
}
