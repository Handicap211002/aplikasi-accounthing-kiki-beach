'use client';

import { FC } from 'react';
import { FaHome, FaMoneyBill, FaChartBar, FaSignOutAlt } from 'react-icons/fa';
import Link from 'next/link';

interface SidebarProps {
  onLogout: () => void;
  isOpen: boolean;
}

const Sidebar: FC<SidebarProps> = ({ onLogout, isOpen }) => {
  return (
    <aside
      className={`bg-blue-900 text-white h-full fixed md:static top-0 left-0 z-40 transition-all duration-300
        ${isOpen ? 'w-64' : 'w-0 md:w-64'} 
        overflow-hidden md:overflow-visible flex flex-col`}
    >
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold mb-6">Accounting</h1>
        <nav className="space-y-4">
          <Link href="/dashboard" className="flex items-center gap-3 hover:text-blue-300">
            <FaHome />
            Dashboard
          </Link>
          <Link href="/dashboard/transaksi" className="flex items-center gap-3 hover:text-blue-300">
            <FaMoneyBill />
            Transaksi
          </Link>
          <Link href="/dashboard/laporan" className="flex items-center gap-3 hover:text-blue-300">
            <FaChartBar />
            Laporan
          </Link>
        </nav>
      </div>
      <div className="p-6 mt-auto">
        <button
          onClick={onLogout}
          className="flex items-center gap-2 hover:text-red-300"
        >
          <FaSignOutAlt />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
