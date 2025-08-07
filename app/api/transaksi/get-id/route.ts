import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const category = searchParams.get('category');
  const type = searchParams.get('type');

  if (!date || !category || !type) {
    return NextResponse.json({ error: 'Missing query params' }, { status: 400 });
  }

  const existing =
    type === 'PEMASUKAN'
      ? await prisma.transaction.findFirst({
          where: {
            date: new Date(date),
            category: category as any,
          },
          select: { id: true },
        })
      : await prisma.expense.findFirst({
          where: {
            date: new Date(date),
            category: category as any,
          },
          select: { id: true },
        });

  if (!existing) {
    return NextResponse.json({ exists: false }, { status: 200 });
  }

  return NextResponse.json({ exists: true, id: existing.id }, { status: 200 });
}
