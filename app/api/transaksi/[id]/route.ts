import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { Category, TransactionType } from '@/types'; // ✅ Ganti dari @prisma/client ke @/types

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');
    const id = idParam ? parseInt(idParam) : undefined;

    if (!id || isNaN(id)) {
      return new Response(JSON.stringify({ error: 'ID tidak valid' }), { status: 400 });
    }

    const body = await req.json();
    const {
      transactionType,
      note,
      // Room
      roomSold,
      extraBed,
      addPerson,
      otherRoom,
      // FB
      beverage,
      seaPantry,
      breakfast,
      addBreakfast,
      otherFb,
      discount,
      totalFbRevenue,
      // Activity
      hotelActivity,
      kikiMassage,
      wowExp,
      // Expense
      amount,
    } = body;

    if (!transactionType || !['PEMASUKAN', 'PENGELUARAN'].includes(transactionType)) {
      return new Response(JSON.stringify({ error: 'Tipe transaksi tidak valid' }), { status: 400 });
    }

    let updatedData;

    if (transactionType === 'PEMASUKAN') {
      updatedData = await prisma.transaction.update({
        where: { id },
        data: {
          roomSold,
          extraBed,
          addPerson,
          otherRoom,
          beverage,
          seaPantry,
          breakfast,
          addBreakfast,
          otherFb,
          discount,
          totalFbRevenue: totalFbRevenue,
          hotelActivity,
          kikiMassage,
          wowExp,
        },
      });
    } else {
      updatedData = await prisma.expense.update({
        where: { id },
        data: {
          note,
          amount,
        },
      });
    }

    return Response.json({ success: true, data: updatedData });
  } catch (error) {
    console.error('[PATCH ERROR]', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
