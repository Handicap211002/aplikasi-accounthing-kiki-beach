// src/types/index.ts

export enum Category {
  ROOM_REVENUE = 'ROOM_REVENUE',
  FB_REVENUE = 'FB_REVENUE',
  ACTIVITY_REVENUE = 'ACTIVITY_REVENUE',
}

export enum TransactionType {
  PEMASUKAN = 'PEMASUKAN',
  PENGELUARAN = 'PENGELUARAN',
}

// Model pemasukan (Transaction dari Prisma)
export interface Transaction {
  id: number;
  date: string;
  category: Category;

  // ROOM_REVENUE fields
  roomSold?: number;
  personPaxRoom?: number;
  roomRevenue?: number;
  extraBed?: number;
  addPerson?: number;
  otherRoom?: number;
  taxi?: number;
  boatRental?: number;
  ticketBtmSg?: number;

  // FB_REVENUE fields
  beverage?: number;
  seaPantry?: number;
  breakfast?: number;
  addBreakfast?: number;
  otherFb?: number;
  discount?: number;
  totalFbRevenue?: number;

  // ACTIVITY_REVENUE fields
  hotelActivity?: number;
  kikiMassage?: number;
  wowExp?: number;
}

// Model pengeluaran (Expense dari Prisma)
export interface Expense {
  id: number;
  date: string;
  category: Category;
  amount: number;
  note: string;
}

// Gabungan untuk ditampilkan di frontend
export type CombinedTransaction = {
  id: number;
  date: string;
  category: Category;
  transactionType: TransactionType;
  note?: string;       // hanya pengeluaran
  amount?: number;     // hanya pengeluaran
  isExpense?: boolean;

  // ROOM_REVENUE
  roomSold?: number;
  personPaxRoom?: number;
  roomRevenue?: number;
  extraBed?: number;
  addPerson?: number;
  otherRoom?: number;
  taxi?: number;
  boatRental?: number;
  ticketBtmSg?: number;

  // FB_REVENUE
  beverage?: number;
  seaPantry?: number;
  breakfast?: number;
  addBreakfast?: number;
  otherFb?: number;
  discount?: number;
  totalFbRevenue?: number;

  // ACTIVITY_REVENUE
  hotelActivity?: number;
  kikiMassage?: number;
  wowExp?: number;
};

// Dipakai saat gabung data dari backend
export type RawCombinedTransaction = (Transaction | Expense) & {
  isExpense?: boolean;
};
