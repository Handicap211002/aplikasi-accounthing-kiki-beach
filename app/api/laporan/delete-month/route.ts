// app/api/laporan/delete-month/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseISO, startOfDay, endOfDay, isValid } from "date-fns";

export async function POST(req: Request) {
    try {
        const { start, end } = await req.json();

        if (!start || !end) {
            return NextResponse.json(
                { error: "start dan end wajib (format: YYYY-MM-DD)" },
                { status: 400 }
            );
        }

        const startAt = startOfDay(parseISO(start));
        const endAt = endOfDay(parseISO(end));

        if (!isValid(startAt) || !isValid(endAt)) {
            return NextResponse.json(
                { error: "Tanggal tidak valid" },
                { status: 400 }
            );
        }

        const [trxDel, expDel] = await prisma.$transaction([
            prisma.transaction.deleteMany({
                where: { date: { gte: startAt, lte: endAt } },
            }),
            prisma.expense.deleteMany({
                where: { date: { gte: startAt, lte: endAt } },
            }),
        ]);

        return NextResponse.json({
            ok: true,
            range: { start: startAt.toISOString(), end: endAt.toISOString() },
            deleted: {
                pemasukan: trxDel.count,
                pengeluaran: expDel.count,
            },
        });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json(
            { error: e?.message || "Gagal menghapus data bulan ini" },
            { status: 500 }
        );
    }
}
