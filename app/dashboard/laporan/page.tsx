// app/dashboard/laporan/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

type RoomRow = {
  id: number; date: string | Date;
  roomSold: number; personPaxRoom: number;
  roomRevenue: number; extraBed: number; addPerson: number; otherRoom: number;
  taxi: number; boatRental: number; ticketBtmSg: number;
};
type FbRow = {
  id: number; date: string | Date;
  foodAlacarte: number;
  beverage: number; seaPantry: number; breakfast: number; addBreakfast: number;
  otherFb: number; discount: number; totalFbRevenue: number;
};
type ActivityRow = {
  id: number; date: string | Date;
  hotelActivity: number; kikiMassage: number; wowExp: number;
};
type ExpenseRow = {
  id: number; date: string | Date;
  category: "ROOM_REVENUE" | "FB_REVENUE" | "ACTIVITY_REVENUE";
  note: string; amount: number;
};

const IDR = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export default function LaporanPage() {
  const [start, setStart] = useState<string>(() => toInputDate(firstDayOfThisMonth()));
  const [end, setEnd] = useState<string>(() => toInputDate(lastDayOfThisMonth()));
  const [month, setMonth] = useState<string>(() => toInputMonth(new Date()));
  const [loading, setLoading] = useState(false);

  const [room, setRoom] = useState<RoomRow[]>([]);
  const [fb, setFb] = useState<FbRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [expense, setExpense] = useState<ExpenseRow[]>([]);

  const fetchData = useCallback(async (overrideStart?: string, overrideEnd?: string) => {
    setLoading(true);
    try {
      const effStart = overrideStart ?? start;
      const effEnd = overrideEnd ?? end;

      const q = new URLSearchParams({ start: effStart, end: effEnd }).toString();
      const res = await fetch(`/api/laporan?${q}`, { cache: "no-store" });
      const json = await res.json();
      setRoom(json.room ?? []);
      setFb(json.fb ?? []);
      setActivity(json.activity ?? []);
      setExpense(json.expense ?? []);
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => {
    fetchData();
  }, []); // initial load

  // Totals
  const totals = useMemo(() => {
    const sum = (arr: any[], key: string) => arr.reduce((s, r) => s + (Number(r[key]) || 0), 0);
    return {
      room: {
        roomRevenue: sum(room, "roomRevenue"),
        extraBed: sum(room, "extraBed"),
        addPerson: sum(room, "addPerson"),
        otherRoom: sum(room, "otherRoom"),
        taxi: sum(room, "taxi"),
        boatRental: sum(room, "boatRental"),
        ticketBtmSg: sum(room, "ticketBtmSg"),
      },
      fb: {
        foodAlacarte: sum(fb, "foodAlacarte"),
        beverage: sum(fb, "beverage"),
        seaPantry: sum(fb, "seaPantry"),
        breakfast: sum(fb, "breakfast"),
        addBreakfast: sum(fb, "addBreakfast"),
        otherFb: sum(fb, "otherFb"),
        discount: sum(fb, "discount"),
        totalFbRevenue: sum(fb, "totalFbRevenue"),
      },
      activity: {
        hotelActivity: sum(activity, "hotelActivity"),
        kikiMassage: sum(activity, "kikiMassage"),
        wowExp: sum(activity, "wowExp"),
      },
      expense: {
        amount: sum(expense, "amount"),
      }
    };
  }, [room, fb, activity, expense]);

  // ================= Export Excel (tetap versi kamu yang sudah beres styling) =================
  const onExportTemplate = useCallback(async () => {
    type Daily = {
      date: string;
      roomSold: number; personPaxRoom: number;
      roomRevenue: number; extraBed: number; addPerson: number; otherRoom: number;
      taxi: number; boatRental: number; ticketBtmSg: number;
      foodAlacarte: number; beverage: number; seaPantry: number; breakfast: number; addBreakfast: number;
      otherFb: number; discount: number; totalFb: number;
      hotelActivity: number; kikiMassage: number; wowExp: number;
    };

    const COLS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U'] as const;
    const START_ROW = 3;
    const MAX_DAY_ROWS = 31;
    const TOTAL_ROW_FALLBACK = START_ROW + MAX_DAY_ROWS;
    const addr = (c: string, r: number) => `${c}${r}`;
    const setValue = (ws: any, a1: string, v: any, t?: 's'|'n') => {
      const cell = ws[a1] ?? {};
      if (cell.f) delete cell.f;
      cell.v = v;
      cell.t = t ?? (typeof v === 'number' ? 'n' : 's');
      ws[a1] = cell;
    };
    const setFormula = (ws: any, a1: string, f: string) => { const cell = ws[a1] ?? {}; cell.f = f; cell.t = 'n'; ws[a1] = cell; };
    const ensureRef = (ws: any, lastRow: number) => { ws['!ref'] = `A1:U${lastRow}`; };
    const findTotalRow = (ws: any) => { for (let r=START_ROW;r<=START_ROW+MAX_DAY_ROWS+3;r++){ const c=ws[addr('A',r)]; if(c && String(c.v).toLowerCase().includes('total')) return r; } return null; };

    // gabung state -> harian
    const key = (d: any) => format(new Date(d), "yyyy-MM-dd");
    const m = new Map<string, Partial<Daily>>();
    for (const r of room) {
      const k = key(r.date); const x = m.get(k) ?? { date: k };
      x.roomSold = Number(r.roomSold ?? 0); x.personPaxRoom = Number(r.personPaxRoom ?? 0);
      x.roomRevenue = Number(r.roomRevenue ?? 0); x.extraBed = Number(r.extraBed ?? 0);
      x.addPerson = Number(r.addPerson ?? 0); x.otherRoom = Number(r.otherRoom ?? 0);
      x.taxi = Number(r.taxi ?? 0); x.boatRental = Number(r.boatRental ?? 0); x.ticketBtmSg = Number(r.ticketBtmSg ?? 0);
      m.set(k, x);
    }
    for (const f of fb) {
      const k = key(f.date); const x = m.get(k) ?? { date: k };
      x.foodAlacarte = Number(f.foodAlacarte ?? 0); x.beverage = Number(f.beverage ?? 0);
      x.seaPantry = Number(f.seaPantry ?? 0); x.breakfast = Number(f.breakfast ?? 0); x.addBreakfast = Number(f.addBreakfast ?? 0);
      x.otherFb = Number(f.otherFb ?? 0); x.discount = Number(f.discount ?? 0);
      const manualFB = (x.foodAlacarte||0)+(x.beverage||0)+(x.seaPantry||0)+(x.breakfast||0)+(x.addBreakfast||0)+(x.otherFb||0)-(x.discount||0);
      x.totalFb = Number(f.totalFbRevenue ?? 0) > 0 ? Number(f.totalFbRevenue) : manualFB;
      m.set(k, x);
    }
    for (const a of activity) {
      const k = key(a.date); const x = m.get(k) ?? { date: k };
      x.hotelActivity = Number(a.hotelActivity ?? 0); x.kikiMassage = Number(a.kikiMassage ?? 0); x.wowExp = Number(a.wowExp ?? 0);
      m.set(k, x);
    }

    const allDates = datesInRangeInclusive(start, end);
    const rows: Daily[] = allDates.map(k => {
      const x = m.get(k) ?? {};
      return {
        date: k,
        roomSold: Number(x.roomSold ?? 0), personPaxRoom: Number(x.personPaxRoom ?? 0),
        roomRevenue: Number(x.roomRevenue ?? 0), extraBed: Number(x.extraBed ?? 0), addPerson: Number(x.addPerson ?? 0), otherRoom: Number(x.otherRoom ?? 0),
        taxi: Number(x.taxi ?? 0), boatRental: Number(x.boatRental ?? 0), ticketBtmSg: Number(x.ticketBtmSg ?? 0),
        foodAlacarte: Number(x.foodAlacarte ?? 0), beverage: Number(x.beverage ?? 0), seaPantry: Number(x.seaPantry ?? 0), breakfast: Number(x.breakfast ?? 0),
        addBreakfast: Number(x.addBreakfast ?? 0), otherFb: Number(x.otherFb ?? 0), discount: Number(x.discount ?? 0), totalFb: Number(x.totalFb ?? 0),
        hotelActivity: Number(x.hotelActivity ?? 0), kikiMassage: Number(x.kikiMassage ?? 0), wowExp: Number(x.wowExp ?? 0),
      };
    });

    const XLSXmod = await import('xlsx-js-style');
    const XLSX: any = (XLSXmod as any).default || XLSXmod;
    const ab = await fetch(`/dataaccounthing.xlsx?v=${Date.now()}`, { cache: 'no-store' }).then(r => r.arrayBuffer());
    const wb = XLSX.read(ab, { type: 'array', cellStyles: true });
    const ws = wb.Sheets['Sheet1'] || wb.Sheets[wb.SheetNames[0]];

    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
      { wch: 16 }, { wch: 16 }, { wch: 12 },
    ];

    // bersihkan area lama tanpa hilang style
    for (let i = 0; i < MAX_DAY_ROWS; i++) {
      const r = START_ROW + i;
      for (const c of COLS) setValue(ws, `${c}${r}`, '');
    }

    // tulis rows
    for (let i = 0; i < rows.length; i++) {
      const r = START_ROW + i;
      const d = rows[i];
      setValue(ws, `A${r}`, d.date, 's');
      const nums = [
        d.roomSold, d.personPaxRoom, d.roomRevenue, d.extraBed, d.addPerson, d.otherRoom,
        d.taxi, d.boatRental, d.ticketBtmSg,
        d.foodAlacarte, d.beverage, d.seaPantry, d.breakfast, d.addBreakfast,
        d.otherFb, d.discount, d.totalFb,
        d.hotelActivity, d.kikiMassage, d.wowExp
      ];
      for (let k = 0; k < nums.length; k++) setValue(ws, `${COLS[k+1]}${r}`, nums[k], 'n');
    }

    const endRow = START_ROW + rows.length - 1;
    const totalRow = findTotalRow(ws) ?? TOTAL_ROW_FALLBACK;
    setValue(ws, `A${totalRow}`, 'Total', 's');
    for (let ci = 1; ci < COLS.length; ci++) {
      const col = COLS[ci];
      setFormula(ws, `${col}${totalRow}`, `SUM(${col}${START_ROW}:${col}${endRow})`);
    }
    ensureRef(ws, Math.max(totalRow, endRow));

    const startMonth = format(new Date(start), 'yyyy-MM');
    const endMonth = format(new Date(end), 'yyyy-MM');
    const label = startMonth === endMonth ? startMonth : `${start}_sampai_${end}`;
    XLSX.writeFile(wb, `Laporan_${label}.xlsx`);
  }, [room, fb, activity, start, end]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-full min-w-0 text-black">
      <header className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="min-w-0">
          <div className="text-xl text-black font-semibold">Laporan</div>
          <div className="text-slate-500 text-sm">Filter periode & ekspor Excel</div>
        </div>

        <div className="w-full sm:w-auto sm:ml-auto min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-end min-w-0">
            {/* Bulan */}
            <div className="flex items-center gap-2 basis-full sm:basis-auto min-w-0 text-black">
              <label className="text-sm text-slate-600 shrink-0">Bulan</label>
              <input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 basis-full sm:basis-auto w-full sm:w-auto">
              <button
                onClick={() => {
                  const { startStr, endStr } = monthRangeFromInput(month);
                  setStart(startStr);
                  setEnd(endStr);
                  fetchData(startStr, endStr);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm w-full sm:w-auto"
              >
                Terapkan
              </button>
              <button
                onClick={onExportTemplate}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm w-full sm:w-auto"
              >
                Export Excel
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* CARDS RINGKAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 min-w-0">
        <StatCard
          title="Total Room Revenue (Subtotal)"
          value={
            totals.room.roomRevenue +
            totals.room.extraBed +
            totals.room.otherRoom +
            totals.room.taxi +
            totals.room.boatRental +
            totals.room.ticketBtmSg
          }
          color="emerald"
        />
        <StatCard title="Total F&B" value={totals.fb.totalFbRevenue} color="sky" />
        <StatCard title="Total Activity" value={totals.activity.hotelActivity + totals.activity.kikiMassage + totals.activity.wowExp} color="amber" />
        <StatCard title="Total Expense" value={totals.expense.amount} color="rose" />
      </div>

      {/* ================= ROOM ================= */}
      <Section title="ROOM_REVENUE">
        {/* Mobile: cards */}
        <div className="grid gap-2 sm:hidden">
          {room.length === 0 && <div className="text-center text-slate-500 bg-white rounded-lg py-4">Tidak ada data.</div>}
          {room.map(r => {
            const sub = r.roomRevenue + r.extraBed + r.otherRoom + r.taxi + r.boatRental + r.ticketBtmSg;
            return (
              <article key={r.id} className="bg-white rounded-lg p-3 shadow-sm border">
                <header className="flex items-center justify-between text-xs text-slate-600">
                  <span>{fmtDateID(r.date)}</span>
                  <span className="font-medium">Subtotal: {IDR.format(sub)}</span>
                </header>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  <Field label="Room Sold" value={String(r.roomSold)} />
                  <Field label="Pax" value={String(r.personPaxRoom)} />
                  <Field label="Add Person" value={IDR.format(r.addPerson)} />
                  <Field label="Room" value={IDR.format(r.roomRevenue)} />
                  <Field label="Extra Bed" value={IDR.format(r.extraBed)} />
                  <Field label="Other" value={IDR.format(r.otherRoom)} />
                  <Field label="Taxi" value={IDR.format(r.taxi)} />
                  <Field label="Boat" value={IDR.format(r.boatRental)} />
                  <Field label="Ticket" value={IDR.format(r.ticketBtmSg)} />
                </dl>
              </article>
            );
          })}
        </div>

        {/* Desktop: table */}
        <div className="hidden sm:block">
          <TableWrapper>
            <table className="min-w-[1000px] md:min-w-full text-xs md:text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-900 z-10">
                <tr className="border-b">
                  {[
                    "Date", "Room Sold", "Person/Pax", "Add Person", "Room Revenue", "Extra Bed",
                    "Other (Room)", "Taxi", "Boat Rental", "Ticket BTM-SG", "Subtotal"
                  ].map(h => (
                    <th key={h} className="px-2 md:px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {room.map(r => {
                  const sub = r.roomRevenue + r.extraBed + r.otherRoom + r.taxi + r.boatRental + r.ticketBtmSg;
                  return (
                    <tr key={r.id} className="border-b odd:bg-white even:bg-slate-50/60 text-slate-800">
                      <td className="px-2 md:px-3 py-2 whitespace-nowrap">{fmtDateID(r.date)}</td>
                      <td className="px-2 md:px-3 py-2 whitespace-nowrap">{r.roomSold}</td>
                      <td className="px-2 md:px-3 py-2 whitespace-nowrap">{r.personPaxRoom}</td>
                      <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(r.addPerson)}</td>
                      <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(r.roomRevenue)}</td>
                      <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(r.extraBed)}</td>
                      <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(r.otherRoom)}</td>
                      <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(r.taxi)}</td>
                      <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(r.boatRental)}</td>
                      <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(r.ticketBtmSg)}</td>
                      <td className="px-2 md:px-3 py-2 font-semibold whitespace-nowrap">{IDR.format(sub)}</td>
                    </tr>
                  );
                })}
                {room.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-4 text-slate-500">Tidak ada data.</td></tr>
                )}
              </tbody>
              <tfoot className="bg-white">
                <tr className="border-t font-semibold text-slate-800">
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap" colSpan={4}>TOTAL</td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(totals.room.roomRevenue)}</td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(totals.room.extraBed)}</td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(totals.room.otherRoom)}</td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(totals.room.taxi)}</td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(totals.room.boatRental)}</td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(totals.room.ticketBtmSg)}</td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">
                    {IDR.format(
                      totals.room.roomRevenue + totals.room.extraBed + totals.room.otherRoom +
                      totals.room.taxi + totals.room.boatRental + totals.room.ticketBtmSg
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </TableWrapper>
        </div>
      </Section>

      {/* ================= FB ================= */}
      <Section title="FB_REVENUE">
        {/* Mobile cards */}
        <div className="grid gap-2 sm:hidden">
          {fb.length === 0 && <div className="text-center text-slate-500 bg-white rounded-lg py-4">Tidak ada data.</div>}
          {fb.map(r => (
            <article key={r.id} className="bg-white rounded-lg p-3 shadow-sm border">
              <header className="flex items-center justify-between text-xs text-slate-600">
                <span>{fmtDateID(r.date)}</span>
                <span className="font-medium">Total: {IDR.format(r.totalFbRevenue)}</span>
              </header>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <Field label="Food" value={IDR.format(r.foodAlacarte)} />
                <Field label="Beverage" value={IDR.format(r.beverage)} />
                <Field label="Sea Pantry" value={IDR.format(r.seaPantry)} />
                <Field label="Breakfast" value={IDR.format(r.breakfast)} />
                <Field label="Add B'fast" value={IDR.format(r.addBreakfast)} />
                <Field label="Other" value={IDR.format(r.otherFb)} />
                <Field label="Discount" value={`- ${IDR.format(r.discount)}`} />
              </dl>
            </article>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block">
          <TableWrapper>
            <table className="min-w-[1000px] md:min-w-full text-xs md:text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-900 z-10">
                <tr className="border-b">
                  {[
                    "Date", "Food Alacarte", "Beverage", "Sea Pantry", "Breakfast",
                    "Add B'fast", "Other (F&B)", "Discount", "Total F&B"
                  ].map(h => (
                    <th key={h} className="px-2 md:px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fb.map(r => (
                  <tr key={r.id} className="border-b odd:bg-white even:bg-slate-50/60 text-slate-800">
                    <td className="px-2 md:px-3 py-2 whitespace-nowrap">{fmtDateID(r.date)}</td>
                    <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(r.foodAlacarte)}</td>
                    <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(r.beverage)}</td>
                    <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(r.seaPantry)}</td>
                    <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(r.breakfast)}</td>
                    <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(r.addBreakfast)}</td>
                    <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(r.otherFb)}</td>
                    <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(r.discount)}</td>
                    <td className="px-2 md:px-3 py-2 font-semibold whitespace-nowrap">{IDR.format(r.totalFbRevenue)}</td>
                  </tr>
                ))}
                {fb.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-4 text-slate-500">Tidak ada data.</td></tr>
                )}
              </tbody>
              <tfoot className="bg-white">
                <tr className="border-t font-semibold text-slate-800">
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">TOTAL</td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(totals.fb.foodAlacarte)}</td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(totals.fb.beverage)}</td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(totals.fb.seaPantry)}</td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(totals.fb.breakfast)}</td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(totals.fb.addBreakfast)}</td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(totals.fb.otherFb)}</td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(totals.fb.discount)}</td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(totals.fb.totalFbRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </TableWrapper>
        </div>
      </Section>

      {/* ================= ACTIVITY ================= */}
      <Section title="ACTIVITY_REVENUE">
        {/* Mobile cards */}
        <div className="grid gap-2 sm:hidden">
          {activity.length === 0 && <div className="text-center text-slate-500 bg-white rounded-lg py-4">Tidak ada data.</div>}
          {activity.map(a => {
            const sub = a.hotelActivity + a.kikiMassage + a.wowExp;
            return (
              <article key={a.id} className="bg-white rounded-lg p-3 shadow-sm border">
                <header className="flex items-center justify-between text-xs text-slate-600">
                  <span>{fmtDateID(a.date)}</span>
                  <span className="font-medium">Subtotal: {IDR.format(sub)}</span>
                </header>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  <Field label="Hotel Activity" value={IDR.format(a.hotelActivity)} />
                  <Field label="Kiki Massage" value={IDR.format(a.kikiMassage)} />
                  <Field label="WOW Exp" value={IDR.format(a.wowExp)} />
                </dl>
              </article>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block">
          <TableWrapper>
            <table className="min-w-[800px] md:min-w-full text-xs md:text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-900 z-10">
                <tr className="border-b">
                  {["Date", "Hotel Activity", "Kiki Massage", "WOW Exp", "Subtotal"].map(h => (
                    <th key={h} className="px-2 md:px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activity.map(a => {
                  const sub = a.hotelActivity + a.kikiMassage + a.wowExp;
                  return (
                    <tr key={a.id} className="border-b odd:bg-white even:bg-slate-50/60 text-slate-800">
                      <td className="px-2 md:px-3 py-2 whitespace-nowrap">{fmtDateID(a.date)}</td>
                      <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(a.hotelActivity)}</td>
                      <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(a.kikiMassage)}</td>
                      <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(a.wowExp)}</td>
                      <td className="px-2 md:px-3 py-2 font-semibold whitespace-nowrap">{IDR.format(sub)}</td>
                    </tr>
                  );
                })}
                {activity.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-4 text-slate-500">Tidak ada data.</td></tr>
                )}
              </tbody>
              <tfoot className="bg-white">
                <tr className="border-t font-semibold text-slate-800">
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">TOTAL</td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(totals.activity.hotelActivity)}</td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(totals.activity.kikiMassage)}</td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(totals.activity.wowExp)}</td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">
                    {IDR.format(totals.activity.hotelActivity + totals.activity.kikiMassage + totals.activity.wowExp)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </TableWrapper>
        </div>
      </Section>

      {/* ================= EXPENSE ================= */}
      <Section title="EXPENSE">
        {/* Mobile cards */}
        <div className="grid gap-2 sm:hidden">
          {expense.length === 0 && <div className="text-center text-slate-500 bg-white rounded-lg py-4">Tidak ada data.</div>}
          {expense.map(e => (
            <article key={e.id} className="bg-white rounded-lg p-3 shadow-sm border">
              <header className="flex items-center justify-between text-xs text-slate-600">
                <span>{fmtDateID(e.date)}</span>
                <span className="font-medium">{IDR.format(e.amount)}</span>
              </header>
              <div className="mt-1 text-xs text-slate-500">{e.category}</div>
              {e.note && <p className="mt-1 text-sm">{e.note}</p>}
            </article>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block">
          <TableWrapper>
            <table className="min-w-[800px] md:min-w-full text-xs md:text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-900 z-10">
                <tr className="border-b">
                  {["Date", "Category", "Note", "Amount"].map(h => (
                    <th key={h} className="px-2 md:px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expense.map(e => (
                  <tr key={e.id} className="border-b odd:bg-white even:bg-slate-50/60 text-slate-800">
                    <td className="px-2 md:px-3 py-2 whitespace-nowrap">{fmtDateID(e.date)}</td>
                    <td className="px-2 md:px-3 py-2 whitespace-nowrap">{e.category}</td>
                    <td className="px-2 md:px-3 py-2 whitespace-normal break-words max-w-[360px]">{e.note}</td>
                    <td className="px-2 md:px-3 py-2 font-semibold whitespace-nowrap">{IDR.format(e.amount)}</td>
                  </tr>
                ))}
                {expense.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-4 text-slate-500">Tidak ada data.</td></tr>
                )}
              </tbody>
              <tfoot className="bg-white">
                <tr className="border-t font-semibold text-slate-800">
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap" colSpan={3}>TOTAL</td>
                  <td className="px-2 md:px-3 py-2 whitespace-nowrap">{IDR.format(totals.expense.amount)}</td>
                </tr>
              </tfoot>
            </table>
          </TableWrapper>
        </div>
      </Section>

      {loading && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center text-white">
          <div className="bg-slate-900 px-4 py-2 rounded-lg shadow">Memuat laporan…</div>
        </div>
      )}
    </div>
  );
}

/* ================ Small helpers/components ================ */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StatCard({ title, value = 0, color }: {
  title: string; value?: number; color: "emerald" | "sky" | "amber" | "rose";
}) {
  const bg = {
    emerald: "bg-emerald-500", sky: "bg-sky-500", amber: "bg-amber-500", rose: "bg-rose-500"
  }[color];
  return (
    <div className={`${bg} text-white rounded-xl p-4 shadow-md`}>
      <div className="text-xs uppercase/5 opacity-90">{title}</div>
      <div className="mt-2 text-2xl font-bold">{IDR.format(value)}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl shadow-sm border min-w-0">
      <header className="px-4 py-3 border-b">
        <div className="text-sm font-semibold">{title}</div>
      </header>
      <div className="p-3 sm:p-0 min-w-0">{children}</div>
    </section>
  );
}

function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full max-w-[100vw] overflow-x-auto overscroll-x-contain rounded-b-xl"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {children}
    </div>
  );
}

function fmtDateID(d: string | Date) {
  const dt = new Date(d);
  return dt.toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "2-digit" });
}

function firstDayOfThisMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function toInputDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function lastDayOfThisMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function toInputMonth(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function monthRangeFromInput(ym: string) {
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr), m = Number(mStr);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  return { startStr: toInputDate(start), endStr: toInputDate(end) };
}
function datesInRangeInclusive(startStr: string, endStr: string) {
  const out: string[] = [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${dd}`);
  }
  return out;
}