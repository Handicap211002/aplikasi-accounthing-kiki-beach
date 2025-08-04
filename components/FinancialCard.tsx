'use client';

import { FiDollarSign, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';

interface FinancialCardProps {
  title: string;
  value: number;
  trend: 'up' | 'down';
}

export default function FinancialCard({ title, value, trend }: FinancialCardProps) {
  const formattedValue = new Intl.NumberFormat('id-ID').format(value);
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-2xl font-bold mt-1">Rp. {formattedValue}, -</p>
        </div>
        <div className={`p-2 rounded-full ${trend === 'up' ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>
          {trend === 'up' ? <FiTrendingUp size={20} /> : <FiTrendingDown size={20} />}
        </div>
      </div>
    </div>
  );
}