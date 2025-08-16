// app/api/dashboard/route.ts
export const runtime = 'nodejs';
export const revalidate = 0;

import { NextResponse } from "next/server";
import { prisma, prismaDirect } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";

const OFFSET = 7 * 60 * 60 * 1000;

function num(v: any): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "object" && typeof (v as any).toNumber === "function") {
    try { return (v as any).toNumber(); } catch { return Number(v); }
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function rangeWIB(nowUtc: Date) {
  const nowWib = new Date(nowUtc.getTime() + OFFSET);
  const y = nowWib.getUTCFullYear();
  const m = nowWib.getUTCMonth();
  const d = nowWib.getUTCDate();
  const d0 = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - OFFSET);
  const d1 = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - OFFSET);
  const m0 = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0) - OFFSET);
  const m1 = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999) - OFFSET);
  const y0 = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0) - OFFSET);
  const y1 = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999) - OFFSET);
  return { yearNow: y, d0, d1, m0, m1, y0, y1 };
}

function incomeOfRow(tx: any): number {
  switch (tx.category) {
    case "ROOM_REVENUE":
      return num(tx.roomRevenue)+num(tx.extraBed)+num(tx.otherRoom)+num(tx.taxi)+num(tx.boatRental)+num(tx.ticketBtmSg);
    case "FB_REVENUE": {
      const total = num(tx.totalFbRevenue);
      if (total > 0) return total;
      // ⬅️ ADD: masukkan foodAlacarte ke perhitungan manual
      return num(tx.foodAlacarte) + num(tx.beverage) + num(tx.seaPantry) + num(tx.breakfast) + num(tx.addBreakfast) + num(tx.otherFb) - num(tx.discount);
    }
    case "ACTIVITY_REVENUE":
      return num(tx.hotelActivity)+num(tx.kikiMassage)+num(tx.wowExp);
    default: return 0;
  }
}
const sumIncome = (arr: any[]) => arr.reduce((s, r) => s + incomeOfRow(r), 0);
const sumExpense = (arr: any[]) => arr.reduce((s, r) => s + num(r.amount), 0);

// helper ambil data dengan client yang diberikan
async function fetchAll(client: PrismaClient) {
  const [txAll, exAll] = await Promise.all([
    client.transaction.findMany({
      select: {
        date: true, category: true,
        // ROOM
        roomRevenue: true, extraBed: true, addPerson: true, otherRoom: true,
        taxi: true, boatRental: true, ticketBtmSg: true,
        // F&B
        foodAlacarte: true,               // ⬅️ ADD
        beverage: true, seaPantry: true, breakfast: true, addBreakfast: true,
        otherFb: true, discount: true, totalFbRevenue: true,
        // ACTIVITY
        hotelActivity: true, kikiMassage: true, wowExp: true,
      },
    }),
    client.expense.findMany({ select: { date: true, amount: true } }),
  ]);
  return { txAll, exAll };
}

export async function GET() {
  try {
    const now = new Date();
    const { yearNow, d0, d1, m0, m1, y0, y1 } = rangeWIB(now);
    const inRange = (d: Date, a: Date, b: Date) => d >= a && d <= b;

    // coba pooler → kalau gagal, fallback ke direct
    let data;
    try {
      data = await fetchAll(prisma);
    } catch (e: any) {
      console.error("Pooler gagal, fallback DIRECT_URL:", e?.message);
      data = await fetchAll(prismaDirect);
    }
    const { txAll, exAll } = data;

    const txToday = txAll.filter(t => inRange(t.date, d0, d1));
    const exToday = exAll.filter(e => inRange(e.date, d0, d1));
    const txMonth = txAll.filter(t => inRange(t.date, m0, m1));
    const exMonth = exAll.filter(e => inRange(e.date, m0, m1));
    const txYear  = txAll.filter(t => inRange(t.date, y0, y1));
    const exYear  = exAll.filter(e => inRange(e.date, y0, y1));

    const cards = {
      incomeToday:  sumIncome(txToday),
      incomeMonth:  sumIncome(txMonth),
      incomeYear:   sumIncome(txYear),
      incomeAll:    sumIncome(txAll),
      expenseToday: sumExpense(exToday),
      expenseMonth: sumExpense(exMonth),
      expenseYear:  sumExpense(exYear),
      expenseAll:   sumExpense(exAll),
    };

    const monthly = Array.from({ length: 12 }, (_, i) => {
      const txM = txYear.filter(t => t.date.getMonth() === i);
      const exM = exYear.filter(e => e.date.getMonth() === i);
      return { monthIndex: i, income: sumIncome(txM), expense: sumExpense(exM) };
    });

    const yearly = Array.from({ length: 5 }, (_, k) => yearNow - 4 + k).map(yr => {
      const txY = txAll.filter(t => t.date.getFullYear() === yr);
      const exY = exAll.filter(e => e.date.getFullYear() === yr);
      return { year: yr, income: sumIncome(txY), expense: sumExpense(exY) };
    });

    const res = NextResponse.json({ cards, charts: { monthly, yearly } });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res;
  } catch (e: any) {
    console.error("DASHBOARD API ERROR:", e);
    const err = NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
    err.headers.set("Cache-Control", "no-store");
    return err;
  }
}
