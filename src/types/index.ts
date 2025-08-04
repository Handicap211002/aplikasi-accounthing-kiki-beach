export interface Database {
  public: {
    Tables: {
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
