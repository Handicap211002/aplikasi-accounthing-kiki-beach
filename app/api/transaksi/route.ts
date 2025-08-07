import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Category } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      date,
      transactionType,
      category,
      note,
      amount,

      // ROOM_REVENUE fields
      roomSold,
      extraBed,
      addPerson,
      otherRoom,
      taxi,
      boatRental,
      ticketBtmSg,

      // FB_REVENUE fields
      beverage,
      seaPantry,
      breakfast,
      addBreakfast,
      otherFb,
      discount,
      totalFbRevenue,

      // ACTIVITY_REVENUE fields
      hotelActivity,
      kikiMassage,
      wowExp,
    } = body;

    const formattedDate = new Date(date);

    if (transactionType === "PENGELUARAN") {
      const existingExpense = await prisma.expense.findFirst({
        where: {
          date: formattedDate,
          category: category as Category,
        },
      });

      if (existingExpense) {
        const updatedExpense = await prisma.expense.update({
          where: { id: existingExpense.id },
          data: {
            amount,
            note,
          },
        });

        return NextResponse.json({ updated: updatedExpense, message: "Expense updated." });
      }

      const createdExpense = await prisma.expense.create({
        data: {
          date: formattedDate,
          category: category as Category,
          amount,
          note,
        },
      });

      return NextResponse.json({ created: createdExpense, message: "Expense created." });
    }

    // PEMASUKAN
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        date: formattedDate,
        category: category as Category,
      },
    });

    const transactionData = {
      date: formattedDate,
      category: category as Category,

      // ROOM_REVENUE
      ...(roomSold !== undefined && { roomSold }),
      ...(extraBed !== undefined && { extraBed }),
      ...(addPerson !== undefined && { addPerson }),
      ...(otherRoom !== undefined && { otherRoom }),
      ...(taxi !== undefined && { taxi }),
      ...(boatRental !== undefined && { boatRental }),
      ...(ticketBtmSg !== undefined && { ticketBtmSg }),

      // FB_REVENUE
      ...(beverage !== undefined && { beverage }),
      ...(seaPantry !== undefined && { seaPantry }),
      ...(breakfast !== undefined && { breakfast }),
      ...(addBreakfast !== undefined && { addBreakfast }),
      ...(otherFb !== undefined && { otherFb }),
      ...(discount !== undefined && { discount }),
      ...(totalFbRevenue !== undefined && { totalFbRevenue }),

      // ACTIVITY_REVENUE
      ...(hotelActivity !== undefined && { hotelActivity }),
      ...(kikiMassage !== undefined && { kikiMassage }),
      ...(wowExp !== undefined && { wowExp }),
    };
console.log("totalFbRevenue dikirim ke DB:", totalFbRevenue);

if (existingTransaction) {
  return NextResponse.json(
    { error: "Transaksi dengan tanggal dan kategori ini sudah ada. Silakan edit jika ingin mengubah." },
    { status: 409 }
  );
}

    const createdTransaction = await prisma.transaction.create({
      data: transactionData,
    });

    return NextResponse.json({ created: createdTransaction, message: "Transaction created." });

  } catch (error) {
    console.error("[POST TRANSAKSI ERROR]", error);
    return new NextResponse("Gagal menyimpan transaksi", { status: 400 });
  }
}
