// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

type G = typeof globalThis & { prisma?: PrismaClient; prismaDirect?: PrismaClient };
const g = globalThis as G;

export const prisma =
  g.prisma ?? new PrismaClient({ log: ['error', 'warn'] });

export const prismaDirect =
  g.prismaDirect ??
  new PrismaClient({
    log: ['error', 'warn'],
    datasources: { db: { url: process.env.DIRECT_URL! } }, // pakai DIRECT_URL (5432)
  });

if (process.env.NODE_ENV !== 'production') {
  g.prisma = prisma;
  g.prismaDirect = prismaDirect;
}
