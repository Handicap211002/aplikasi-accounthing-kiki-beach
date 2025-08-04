export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      // Contoh tabel, ganti sesuai project kamu
      transaksi: {
        Row: {
          id: number;
          jumlah: number;
          keterangan: string | null;
          tanggal: string;
        };
        Insert: {
          jumlah: number;
          keterangan?: string | null;
          tanggal: string;
        };
        Update: {
          jumlah?: number;
          keterangan?: string | null;
          tanggal?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
