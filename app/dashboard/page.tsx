'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setUserName(user.user_metadata?.full_name || 'Kasir');
        setLoading(false);
      } else {
        router.replace('/');
      }
    };

    getUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar onLogout={handleLogout} isOpen={sidebarOpen} />

      {/* Main Content */}
      <div
        className={`flex flex-col flex-1 transition-all duration-300
          ${sidebarOpen ? 'translate-x-64 md:translate-x-0' : 'translate-x-0'}
        `}
      >
        <Navbar
          userName={userName}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="p-4 md:p-6 flex-1 bg-gray-100">
          <h1 className="text-2xl font-bold mb-4">Selamat Datang, {userName}</h1>
          <p className="text-gray-700">Ini adalah halaman Dashboard utama Anda.</p>
        </main>
      </div>
    </div>
  );
}
