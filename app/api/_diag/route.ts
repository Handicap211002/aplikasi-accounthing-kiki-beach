// app/api/_diag/route.ts
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [tx, ex] = await Promise.all([
      prisma.transaction.count(),
      prisma.expense.count(),
    ]);
    return NextResponse.json({ ok: true, counts: { transaction: tx, expense: ex } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message }, { status: 500 });
  }
}
