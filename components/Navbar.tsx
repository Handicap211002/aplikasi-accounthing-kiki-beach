'use client';

import { FC } from 'react';
import { FaBars, FaSignOutAlt } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface NavbarProps {
  userName: string;
  onToggleSidebar: () => void;
}

const Navbar: FC<NavbarProps> = ({ userName, onToggleSidebar }) => {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <header className="bg-white shadow px-4 py-3 flex items-center justify-between sticky top-0 z-30">
      <button
        onClick={onToggleSidebar}
        className="text-gray-800 text-2xl focus:outline-none"
      >
        <FaBars />
      </button>

      <div className="flex items-center gap-3 ml-auto">
        <span className="text-gray-700">Hi, {userName}</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-700 hover:text-red-600 text-sm"
        >
          <FaSignOutAlt className="text-lg" />
          Logout
        </button>
      </div>
    </header>
  );
};

export default Navbar;