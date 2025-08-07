// app/api/transaksi/check/route.ts
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const category = searchParams.get("category");
  const transactionType = searchParams.get("transactionType");

  if (!date || !category || !transactionType) {
    return new Response(JSON.stringify({ error: "Tanggal, kategori, dan jenis transaksi wajib diisi" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const startOfDay = new Date(date);
  const endOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    if (transactionType === "PENGELUARAN") {
      const existingExpense = await prisma.expense.findFirst({
        where: {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
          category: category as any, // atau as Category
        },
      });

      return new Response(
        JSON.stringify({
          exists: !!existingExpense,
          existingId: existingExpense?.id || null,
          existingData: existingExpense || null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
          category: category as any, // atau as Category

        },
      });

      return new Response(
        JSON.stringify({
          exists: !!existingTransaction,
          existingId: existingTransaction?.id || null,
          existingData: existingTransaction || null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("[CHECK TRANSAKSI ERROR]", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
