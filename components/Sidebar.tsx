'use client';

import { FC } from 'react';
import { FaHome, FaMoneyBill, FaChartBar, FaSignOutAlt } from 'react-icons/fa';

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
          <a href="#" className="flex items-center gap-3 hover:text-blue-300">
            <FaHome />
            Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 hover:text-blue-300">
            <FaMoneyBill />
            Transaksi
          </a>
          <a href="#" className="flex items-center gap-3 hover:text-blue-300">
            <FaChartBar />
            Laporan
          </a>
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
