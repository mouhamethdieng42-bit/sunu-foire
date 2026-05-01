'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    products: 0,
    orders: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // Nombre d'utilisateurs
    const { count: usersCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Nombre de produits
    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    // Nombre de commandes et revenus
    const { data: orders } = await supabase
      .from('orders')
      .select('commission');

    let totalCommission = 0;
    if (orders) {
      totalCommission = orders.reduce((sum, order) => sum + (order.commission || 0), 0);
    }

    setStats({
      users: usersCount || 0,
      products: productsCount || 0,
      orders: orders?.length || 0,
      revenue: totalCommission,
    });
    setLoading(false);
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">📊 Tableau de bord Admin</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
          <p className="text-gray-500 text-sm">Utilisateurs</p>
          <p className="text-3xl font-bold">{stats.users}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
          <p className="text-gray-500 text-sm">Produits</p>
          <p className="text-3xl font-bold">{stats.products}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-orange-500">
          <p className="text-gray-500 text-sm">Commandes</p>
          <p className="text-3xl font-bold">{stats.orders}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-purple-500">
          <p className="text-gray-500 text-sm">Revenus (commissions)</p>
          <p className="text-3xl font-bold">{stats.revenue.toLocaleString()} FCFA</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="/admin/users" className="bg-blue-600 text-white text-center p-4 rounded-lg hover:bg-blue-700">
          👥 Gérer les utilisateurs
        </a>
        <a href="/admin/products" className="bg-green-600 text-white text-center p-4 rounded-lg hover:bg-green-700">
          📦 Gérer les produits
        </a>
        <a href="/admin/orders" className="bg-orange-600 text-white text-center p-4 rounded-lg hover:bg-orange-700">
          📝 Gérer les commandes
        </a>
      </div>
    </div>
  );
}