'use client';

import { useEffect, useState } from 'react';
import { Category, TransactionType } from '@/types';

interface TambahTransaksiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function TambahTransaksiModal({ isOpen, onClose, onSubmit }: TambahTransaksiModalProps) {
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [transactionType, setTransactionType] = useState<TransactionType | ''>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [note, setNote] = useState('');

  // ROOM REVENUE
  const [roomSold, setRoomSold] = useState<number | ''>('');
  const [extraBed, setExtraBed] = useState<number | ''>('');
  const [addPerson, setAddPerson] = useState<number | ''>('');
  const [otherRoom, setOtherRoom] = useState<number | ''>('');
  const [taxi, setTaxi] = useState<number | ''>('');
  const [boatRental, setBoatRental] = useState<number | ''>('');
  const [ticketBtmSg, setTicketBtmSg] = useState<number | ''>('');
  const [personPaxRoom, setPersonPaxRoom] = useState<number | ''>(''); // Tambahan ke-8
  const [roomRevenue, setRoomRevenue] = useState<number | ''>('');

  // FB REVENUE
  const [beverage, setBeverage] = useState<number | ''>('');
  const [seaPantry, setSeaPantry] = useState<number | ''>('');
  const [breakfast, setBreakfast] = useState<number | ''>('');
  const [addBreakfast, setAddBreakfast] = useState<number | ''>('');
  const [otherFb, setOtherFb] = useState<number | ''>('');
  const [discount, setDiscount] = useState<number | ''>('');
  const [totalFbRevenue, setTotalFbRevenue] = useState<number | ''>('');

  // ACTIVITY REVENUE
  const [hotelActivity, setHotelActivity] = useState<number | ''>('');
  const [kikiMassage, setKikiMassage] = useState<number | ''>('');
  const [wowExp, setWowExp] = useState<number | ''>('');
  const [alertType, setAlertType] = useState<'success' | 'warning' | 'error' | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);



  // Hitung total F&B otomatis
  useEffect(() => {
    if (transactionType === TransactionType.PEMASUKAN && category === Category.FB_REVENUE) {
      const total =
        (Number(beverage) || 0) +
        (Number(seaPantry) || 0) +
        (Number(breakfast) || 0) +
        (Number(addBreakfast) || 0) +
        (Number(otherFb) || 0) -
        (Number(discount) || 0);
      setTotalFbRevenue(total);
    }
  }, [beverage, seaPantry, breakfast, addBreakfast, otherFb, discount, transactionType, category]);
  const handleSubmit = async () => {
    if (!date || !category || !transactionType) {
      setAlertType('warning');
      setAlertMessage('Mohon lengkapi semua field wajib!');
      return;
    }

    const formattedDate = new Date(date).toISOString().split('T')[0];

    try {
      const res = await fetch(`/api/transaksi/check?date=${formattedDate}&category=${category}&transactionType=${transactionType}`, {
        method: 'GET',
      });

      const result = await res.json();

      // Cek jika data sudah pernah diinput
      if (result.exists) {
        setAlertType('warning');
        setAlertMessage('Kategori ini sudah diinput untuk tanggal tersebut. Silakan edit jika ada perubahan.');
        return;
      }

      // Prepare payload
      const data: any = {
        date: formattedDate,
        category,
        transactionType,
      };

      if (transactionType === TransactionType.PENGELUARAN) {
        data.amount = Number(amount) || 0;
        data.note = note || '';
      }

      if (category === 'ROOM_REVENUE') {
        data.roomSold = Number(roomSold) || 0;
        data.extraBed = Number(extraBed) || 0;
        data.addPerson = Number(addPerson) || 0;
        data.otherRoom = Number(otherRoom) || 0;
        data.taxi = Number(taxi) || 0;
        data.boatRental = Number(boatRental) || 0;
        data.ticketBtmSg = Number(ticketBtmSg) || 0;
        data.personPaxRoom = Number(personPaxRoom) || 0;
        data.roomRevenue = Number(roomRevenue) || 0;
      } else if (category === 'FB_REVENUE') {
        data.beverage = Number(beverage) || 0;
        data.seaPantry = Number(seaPantry) || 0;
        data.breakfast = Number(breakfast) || 0;
        data.addBreakfast = Number(addBreakfast) || 0;
        data.otherFb = Number(otherFb) || 0;
        data.discount = Number(discount) || 0;
        data.totalFbRevenue = Number(totalFbRevenue) || 0;
      } else if (category === 'ACTIVITY_REVENUE') {
        data.hotelActivity = Number(hotelActivity) || 0;
        data.kikiMassage = Number(kikiMassage) || 0;
        data.wowExp = Number(wowExp) || 0;
      }

      // Kirim request POST
      const response = await fetch('/api/transaksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let errorMsg = 'Gagal menyimpan transaksi';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          errorMsg = await response.text();
        }

        setAlertType('error');
        setAlertMessage(errorMsg);
        return;
      }

      // ✅ Jika berhasil
      const resultData = await response.json();
      setAlertType('success');
      setAlertMessage('Transaksi berhasil disimpan');

      setTimeout(() => {
        onSubmit(resultData); // sync ke parent
        onClose(); // tutup modal
        window.location.reload(); // reload data
      }, 1500);

    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setAlertType('error');
      setAlertMessage(`Gagal menyimpan: ${errorMessage}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 px-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-4 shadow-lg sm:p-6">
        <h2 className="text-xl font-semibold mb-4">Tambah Transaksi</h2>
        <div className="space-y-4">
          {alertMessage && (
            <div
              className={`p-2 rounded text-sm ${alertType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
            >
              {alertMessage}
            </div>
          )}

          <div>
            <label className="block mb-1 font-medium">Jenis Transaksi</label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value as TransactionType)}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="">-- Pilih Jenis --</option>
              <option value={TransactionType.PEMASUKAN}>Pemasukan</option>
              <option value={TransactionType.PENGELUARAN}>Pengeluaran</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="">-- Pilih Kategori --</option>
              {Object.values(Category).map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          {transactionType === TransactionType.PEMASUKAN && category === Category.ROOM_REVENUE && (
            <>
              <h3 className="font-semibold">Detail Room Revenue</h3>
              <Input label="Room Sold" value={roomSold} onChange={setRoomSold} />
              <Input label="Extra Bed" value={extraBed} onChange={setExtraBed} />
              <Input label="Add Person" value={addPerson} onChange={setAddPerson} />
              <Input label="Other Room" value={otherRoom} onChange={setOtherRoom} />
              <Input label="Taxi" value={taxi} onChange={setTaxi} />
              <Input label="Boat Rental" value={boatRental} onChange={setBoatRental} />
              <Input label="Ticket BTM-SG" value={ticketBtmSg} onChange={setTicketBtmSg} />
              <Input label="PersonPax" value={personPaxRoom} onChange={setPersonPaxRoom} />
              <Input label="roomRevenue" value={roomRevenue} onChange={setRoomRevenue} />
            </>
          )}

          {transactionType === TransactionType.PEMASUKAN && category === Category.FB_REVENUE && (
            <>
              <h3 className="font-semibold">Detail FB Revenue</h3>
              <Input label="Beverage" value={beverage} onChange={setBeverage} />
              <Input label="Sea Pantry" value={seaPantry} onChange={setSeaPantry} />
              <Input label="Breakfast" value={breakfast} onChange={setBreakfast} />
              <Input label="Add Breakfast" value={addBreakfast} onChange={setAddBreakfast} />
              <Input label="Other FB" value={otherFb} onChange={setOtherFb} />
              <Input label="Discount" value={discount} onChange={setDiscount} />
              <Input label="Total Revenue (otomatis)" value={totalFbRevenue} onChange={() => { }} disabled />
            </>
          )}

          {transactionType === TransactionType.PEMASUKAN && category === Category.ACTIVITY_REVENUE && (
            <>
              <h3 className="font-semibold">Detail Activity Revenue</h3>
              <Input label="Hotel Activity" value={hotelActivity} onChange={setHotelActivity} />
              <Input label="Kiki Massage" value={kikiMassage} onChange={setKikiMassage} />
              <Input label="WOW Experience" value={wowExp} onChange={setWowExp} />
            </>
          )}

          {transactionType === TransactionType.PENGELUARAN && (
            <>
              <h3 className="font-semibold">Pengeluaran</h3>
              <Input label="Jumlah Pengeluaran" value={amount} onChange={setAmount} />
              <div>
                <label className="block mb-1 font-medium">Keterangan</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                  placeholder="Contoh: Pembelian ATK"
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400">
            Batal
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white">
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

// Reusable Input Component
function Input({ label, value, onChange, disabled = false }: {
  label: string;
  value: number | '';
  onChange: (val: number | '') => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block mb-1 font-medium">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className="w-full border px-3 py-2 rounded"
        placeholder="Rp 0"
        disabled={disabled}
      />
    </div>
  );
}
