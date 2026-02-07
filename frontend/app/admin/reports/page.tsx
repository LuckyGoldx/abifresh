'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface SalesReport {
  total_sales: number;
  total_amount: number;
  total_items: number;
  sales_by_staff: Array<{
    staff_name: string;
    total_sales: number;
    total_amount: number;
  }>;
  sales_by_day: Array<{
    date: string;
    total_sales: number;
    total_amount: number;
  }>;
}

export default function ReportsPage() {
  const [report, setReport] = useState<SalesReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('week');

  useEffect(() => {
    fetchReport();
  }, [dateRange]);

  const fetchReport = async () => {
    try {
      const response = await api.get(`/api/admin/reports/sales?range=${dateRange}`);
      setReport(response.data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-8 h-8 text-pink-500" />
          Sales Reports
        </h1>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="input w-48"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Total Sales</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white">{report?.total_sales || 0}</p>
        </div>
        <div className="card">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Total Revenue</p>
          <p className="text-3xl font-bold text-green-600">₦{(report?.total_amount || 0).toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Items Sold</p>
          <p className="text-3xl font-bold text-blue-600">{report?.total_items || 0}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Sales by Staff</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={report?.sales_by_staff || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="staff_name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total_amount" fill="#ec4899" name="Revenue (₦)" />
            <Bar dataKey="total_sales" fill="#3b82f6" name="Sales Count" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Sales Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={report?.sales_by_day || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="total_amount" stroke="#ec4899" name="Revenue (₦)" />
            <Line type="monotone" dataKey="total_sales" stroke="#3b82f6" name="Sales Count" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
