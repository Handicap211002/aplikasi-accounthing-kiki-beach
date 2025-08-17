// app/dashboard/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { createClient } from "@supabase/supabase-js";

type Cards = {
  incomeToday: number; incomeMonth: number; incomeYear: number; incomeAll: number;
  expenseToday: number; expenseMonth: number; expenseYear: number; expenseAll: number;
};
type Monthly = { monthIndex: number; income: number; expense: number };
type Yearly = { year: number; income: number; expense: number };

const IDR = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const defaultCards: Cards = {
  incomeToday: 0, incomeMonth: 0, incomeYear: 0, incomeAll: 0,
  expenseToday: 0, expenseMonth: 0, expenseYear: 0, expenseAll: 0,
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardPage() {
  const [cards, setCards] = useState<Cards>(defaultCards);
  const [monthly, setMonthly] = useState<Monthly[]>([]);
  const [yearly, setYearly] = useState<Yearly[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/dashboard", { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setCards(json.cards ?? defaultCards);
    setMonthly(json.charts?.monthly ?? []);
    setYearly(json.charts?.yearly ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));

    // Realtime: dengarkan semua perubahan di 2 tabel
    const channel = supabase
      .channel("dashboard-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "Transaction" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "Expense" }, () => fetchData())
      .subscribe();

    // Refetch ketika user kembali ke tab
    const onFocus = () => fetchData();
    window.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchData]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl text-black font-semibold">Dashboard <span className="text-slate-500 text-sm">Control panel</span></h1>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Pemasukan Hari Ini" value={cards.incomeToday} color="emerald" />
        <StatCard title="Pemasukan Bulan Ini" value={cards.incomeMonth} color="sky" />
        <StatCard title="Pemasukan Tahun Ini" value={cards.incomeYear} color="amber" />
        <StatCard title="Seluruh Pemasukan" value={cards.incomeAll} color="teal" />
        <StatCard title="Pengeluaran Hari Ini" value={cards.expenseToday} color="rose" />
        <StatCard title="Pengeluaran Bulan Ini" value={cards.expenseMonth} color="orange" />
        <StatCard title="Pengeluaran Tahun Ini" value={cards.expenseYear} color="red" />
        <StatCard title="Seluruh Pengeluaran" value={cards.expenseAll} color="slate" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* GRAFIK */}
        <div className="xl:col-span-2 text-black space-y-6">
          <Section title="Grafik Data Pemasukan & Pengeluaran Per Bulan">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly.map(m => ({ name: monthNames[m.monthIndex], income: m.income, expense: m.expense }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => (v / 1_000_000).toFixed(0) + " jt"} />
                  <Tooltip formatter={(v: any) => IDR.format(Number(v))} />
                  <Legend />
                  <Bar dataKey="income" name="Pemasukan" fill="#22c55e" />  {/* Hijau */}
                  <Bar dataKey="expense" name="Pengeluaran" fill="#ef4444" /> {/* Merah */}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          <Section title="Grafik Data Pemasukan & Pengeluaran Per Tahun">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearly.map(y => ({ name: String(y.year), income: y.income, expense: y.expense }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => (v / 1_000_000).toFixed(0) + " jt"} />
                  <Tooltip formatter={(v: any) => IDR.format(Number(v))} />
                  <Legend />
                  <Bar dataKey="income" name="Pemasukan" fill="#22c55e" />  {/* Hijau */}
                  <Bar dataKey="expense" name="Pengeluaran" fill="#ef4444" /> {/* Merah */}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>

        {/* KALENDER */}
        <div className="xl:col-span-1 text-black">
          <Section title="Kalender">
            <MiniCalendar />
          </Section>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center text-white">
          <div className="bg-slate-900 px-4 py-2 rounded-lg shadow">Memuat dashboard…</div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value = 0, color }: { title: string; value?: number; color: "emerald" | "sky" | "amber" | "teal" | "rose" | "orange" | "red" | "slate" }) {
  const bg = {
    emerald: "bg-emerald-500", sky: "bg-sky-500", amber: "bg-amber-500",
    teal: "bg-teal-600", rose: "bg-rose-500", orange: "bg-orange-500",
    red: "bg-red-600", slate: "bg-slate-700",
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
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <div className="text-sm font-semibold mb-3">{title}</div>
      {children}
    </div>
  );
}

function MiniCalendar() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-emerald-500 text-white rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/20 flex items-center justify-between">
        <div className="font-semibold">Kalender</div>
        <div className="text-sm">{format(today, "MMMM yyyy")}</div>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-7 text-center text-[11px] uppercase opacity-90 mb-2">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            const isToday = d === today.getDate();
            return (
              <div key={i} className={`h-8 flex items-center justify-center text-sm rounded ${d ? "bg-white/10" : ""} ${isToday ? "ring-2 ring-white font-semibold" : ""}`}>
                {d ?? ""}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
