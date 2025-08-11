'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
      <Sidebar onLogout={handleLogout} isOpen={sidebarOpen} />
      <div
        className={`flex flex-col flex-1 transition-all duration-300 ${
          sidebarOpen ? 'translate-x-45 md:translate-x-0' : 'translate-x-0'
        }`}
      >
        <Navbar
          userName={userName}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="p-4 md:p-6 flex-1 bg-gray-100 overflow-auto">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}