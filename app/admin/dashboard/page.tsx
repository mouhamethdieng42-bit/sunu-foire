'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface DashboardStats {
  totalUsers: number;
  totalSellers: number;
  totalBuyers: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalSellers: 0,
    totalBuyers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
  });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [roleDistribution, setRoleDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      router.push('/');
      return;
    }

    const { data: users } = await supabase
      .from('profiles')
      .select('role');
    const totalUsers = users?.length || 0;
    const totalSellers = users?.filter(u => u.role === 'seller').length || 0;
    const totalBuyers = users?.filter(u => u.role === 'buyer').length || 0;
    setRoleDistribution([
      { name: 'Acheteurs', value: totalBuyers },
      { name: 'Producteurs', value: totalSellers },
    ]);

    const { data: orders } = await supabase
      .from('orders')
      .select('status, total_amount, created_at');
    const totalOrders = orders?.length || 0;
    const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
    const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
    const processingOrders = orders?.filter(o => o.status === 'processing').length || 0;
    const shippedOrders = orders?.filter(o => o.status === 'shipped').length || 0;
    const deliveredOrders = orders?.filter(o => o.status === 'delivered').length || 0;
    const cancelledOrders = orders?.filter(o => o.status === 'cancelled').length || 0;

    setStats({
      totalUsers,
      totalSellers,
      totalBuyers,
      totalOrders,
      totalRevenue,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
    });

    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    }).reverse();

    const salesByDay = last7Days.map(day => {
      const dayOrders = orders?.filter(o => o.created_at?.startsWith(day)) || [];
      const total = dayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      return { date: day, total };
    });
    setSalesData(salesByDay);

    setLoading(false);
  };

  const COLORS = ['#0088FE', '#00C49F'];

  if (loading) return <div className="p-8 text-center">Chargement du tableau de bord...</div>;

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">📊 Tableau de bord administrateur</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Utilisateurs totaux</p>
          <p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Producteurs</p>
          <p className="text-2xl font-bold text-green-600">{stats.totalSellers}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Commandes</p>
          <p className="text-2xl font-bold text-purple-600">{stats.totalOrders}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Chiffre d'affaires</p>
          <p className="text-2xl font-bold text-green-600">{stats.totalRevenue.toLocaleString()} FCFA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-4">📈 Évolution des ventes (7 derniers jours)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(v) => `${v.toLocaleString()} F`} />
              <Tooltip formatter={(value: any) => `${Number(value).toLocaleString()} FCFA`} />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#16a34a" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-4">👥 Répartition des utilisateurs</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={roleDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent = 0 }) => `${name}: ${Math.round(percent * 100)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {roleDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-4">📦 Statut des commandes</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <p className="text-yellow-800 font-semibold">En attente</p>
            <p className="text-2xl font-bold">{stats.pendingOrders}</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-blue-800 font-semibold">En préparation</p>
            <p className="text-2xl font-bold">{stats.processingOrders}</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-purple-800 font-semibold">Expédiée</p>
            <p className="text-2xl font-bold">{stats.shippedOrders}</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-green-800 font-semibold">Livrée</p>
            <p className="text-2xl font-bold">{stats.deliveredOrders}</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-red-800 font-semibold">Annulée</p>
            <p className="text-2xl font-bold">{stats.cancelledOrders}</p>
          </div>
        </div>
      </div>
    </div>
  );
}