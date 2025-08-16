// app/api/laporan/route.ts
export const runtime = 'nodejs';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma, prismaDirect } from '@/lib/prisma';
import type { PrismaClient } from '@prisma/client';

const OFFSET = 7 * 60 * 60 * 1000; // WIB

function num(v: any): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'object' && typeof (v as any).toNumber === 'function') {
    try { return (v as any).toNumber(); } catch { return Number(v); }
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// WIB day start/end → UTC Date
function dayRangeWIB(d: Date) {
  const wib = new Date(d.getTime() + OFFSET);
  const y = wib.getUTCFullYear();
  const m = wib.getUTCMonth();
  const dd = wib.getUTCDate();
  const start = new Date(Date.UTC(y, m, dd, 0, 0, 0, 0) - OFFSET);
  const end   = new Date(Date.UTC(y, m, dd, 23, 59, 59, 999) - OFFSET);
  return { start, end };
}
function monthRangeWIB(d: Date) {
  const wib = new Date(d.getTime() + OFFSET);
  const y = wib.getUTCFullYear();
  const m = wib.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0) - OFFSET);
  const end   = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999) - OFFSET);
  return { start, end };
}

function asDate(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function fetchAll(client: PrismaClient, start: Date, end: Date) {
  // Ambil Transaction sekali, nanti difilter per kategori di code
  const tx = await client.transaction.findMany({
    where: { date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
    select: {
      id: true, date: true, category: true,
      roomSold: true, personPaxRoom: true,
      roomRevenue: true, extraBed: true, addPerson: true, otherRoom: true, taxi: true, boatRental: true, ticketBtmSg: true,
      foodAlacarte: true,   
      beverage: true, seaPantry: true, breakfast: true, addBreakfast: true, otherFb: true, discount: true, totalFbRevenue: true,
      hotelActivity: true, kikiMassage: true, wowExp: true,
    },
  });

  const ex = await client.expense.findMany({
    where: { date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
    select: { id: true, date: true, category: true, amount: true, note: true },
  });

  return { tx, ex };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const startStr = url.searchParams.get('start');
    const endStr = url.searchParams.get('end');

    // default: bulan berjalan (WIB)
    const now = new Date();
    const defaultRange = monthRangeWIB(now);

    const startWIB = asDate(startStr) ?? defaultRange.start;
    const endWIB = asDate(endStr) ?? defaultRange.end;

    // Normalisasi ke WIB day start/end
    const start = dayRangeWIB(startWIB).start;
    const end = dayRangeWIB(endWIB).end;

    let data;
    try {
      data = await fetchAll(prisma, start, end);
    } catch (e: any) {
      console.error('Pooler gagal, fallback DIRECT_URL:', e?.message);
      data = await fetchAll(prismaDirect, start, end);
    }

    const room = data.tx.filter(t => t.category === 'ROOM_REVENUE').map(t => ({
      id: t.id,
      date: t.date,
      roomSold: t.roomSold ?? 0,
      personPaxRoom: t.personPaxRoom ?? 0,
      roomRevenue: num(t.roomRevenue),
      extraBed: num(t.extraBed),
      addPerson: num(t.addPerson),
      otherRoom: num(t.otherRoom),
      taxi: num(t.taxi),
      boatRental: num(t.boatRental),
      ticketBtmSg: num(t.ticketBtmSg),
    }));

    const fb = data.tx.filter(t => t.category === 'FB_REVENUE').map(t => {
      const manual = num(t.beverage) + num(t.foodAlacarte) +  num(t.seaPantry) + num(t.breakfast) + num(t.addBreakfast) + num(t.otherFb) - num(t.discount);
      const total = num(t.totalFbRevenue) > 0 ? num(t.totalFbRevenue) : manual;
      return {
        id: t.id,
        date: t.date,
        foodAlacarte: num(t.foodAlacarte),   
        beverage: num(t.beverage),
        seaPantry: num(t.seaPantry),
        breakfast: num(t.breakfast),
        addBreakfast: num(t.addBreakfast),
        otherFb: num(t.otherFb),
        discount: num(t.discount),
        totalFbRevenue: total,
      };
    });

    const activity = data.tx.filter(t => t.category === 'ACTIVITY_REVENUE').map(t => ({
      id: t.id,
      date: t.date,
      hotelActivity: num(t.hotelActivity),
      kikiMassage: num(t.kikiMassage),
      wowExp: num(t.wowExp),
    }));

    const expense = data.ex.map(e => ({
      id: e.id,
      date: e.date,
      category: e.category,
      note: e.note,
      amount: num(e.amount),
    }));

    const res = NextResponse.json({ room, fb, activity, expense });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res;
  } catch (e: any) {
    console.error('LAPORAN API ERROR:', e);
    const err = NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
    err.headers.set('Cache-Control', 'no-store');
    return err;
  }
}
