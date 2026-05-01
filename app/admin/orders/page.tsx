'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AdminOrdersContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('user');
  
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
    fetchOrders();
  }, [userId]);

  useEffect(() => {
    filterOrders();
  }, [searchTerm, statusFilter, dateFilter, orders]);

  const fetchUser = async () => {
    const { data } = await supabase.from('profiles').select('full_name, email').eq('id', userId).single();
    setUserInfo(data);
  };

  const fetchOrders = async () => {
    let query = supabase
      .from('orders')
      .select('*, profiles(full_name, email), order_items(*, products(*))')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('buyer_id', userId);
    }

    const { data } = await query;
    setOrders(data || []);
    setLoading(false);
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        if (dateFilter === 'today') return orderDate >= today;
        if (dateFilter === 'week') return orderDate >= weekAgo;
        if (dateFilter === 'month') return orderDate >= monthAgo;
        return true;
      });
    }

    setFilteredOrders(filtered);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', id);
    fetchOrders();
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      processing: { label: 'En préparation', color: 'bg-blue-100 text-blue-800' },
      shipped: { label: 'Expédiée', color: 'bg-purple-100 text-purple-800' },
      delivered: { label: 'Livrée', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800' },
    };
    return config[status as keyof typeof config] || config.pending;
  };

  const stats = {
    total: orders.length,
    totalAmount: orders.reduce((sum, o) => sum + o.total_amount, 0),
    pending: orders.filter(o => o.status === 'pending').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">📝 Gestion des commandes</h1>
        {userId && userInfo && (
          <Link href="/admin/users" className="text-blue-600 hover:underline">
            ← Retour aux utilisateurs
          </Link>
        )}
      </div>

      {userId && userInfo && (
        <div className="bg-blue-50 p-4 rounded-xl mb-6">
          <p className="font-semibold">{userInfo.full_name || 'Utilisateur'}</p>
          <p className="text-sm text-gray-600">{userInfo.email}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-blue-500">
          <p className="text-gray-500 text-sm">Total commandes</p>
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-green-500">
          <p className="text-gray-500 text-sm">Montant total</p>
          <p className="text-2xl font-bold text-green-600">{stats.totalAmount.toLocaleString()} FCFA</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-yellow-500">
          <p className="text-gray-500 text-sm">En attente</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-green-500">
          <p className="text-gray-500 text-sm">Livrées</p>
          <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-red-500">
          <p className="text-gray-500 text-sm">Annulées</p>
          <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">🔍 Rechercher</label>
          <input
            type="text"
            placeholder="Client, email ou N° commande..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">📊 Statut</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Tous</option>
            <option value="pending">En attente</option>
            <option value="processing">En préparation</option>
            <option value="shipped">Expédiée</option>
            <option value="delivered">Livrée</option>
            <option value="cancelled">Annulée</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">📅 Période</label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Toutes</option>
            <option value="today">Aujourd'hui</option>
            <option value="week">7 derniers jours</option>
            <option value="month">30 derniers jours</option>
          </select>
        </div>
        <div>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setDateFilter('all');
            }}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const statusBadge = getStatusBadge(order.status);
          const totalItems = order.order_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
          const isExpanded = expandedOrder === order.id;

          return (
            <div key={order.id} className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b flex flex-wrap justify-between items-center gap-2">
                <div>
                  <p className="font-semibold">{order.profiles?.full_name || 'Client'}</p>
                  <p className="text-xs text-gray-400">N° {order.id.slice(0, 8)}...</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.color}`}>
                    {statusBadge.label}
                  </span>
                  <p className="font-bold text-green-600">{order.total_amount.toLocaleString()} FCFA</p>
                  <button
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {isExpanded ? '▲ Voir moins' : '▼ Voir détails'}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 bg-gray-50 border-b">
                  <p className="text-sm text-gray-600">📅 {new Date(order.created_at).toLocaleString()}</p>
                  <p className="text-sm text-gray-600">📦 {totalItems} article(s)</p>
                  <p className="text-sm text-gray-600">📍 {order.delivery_address}</p>
                  <p className="text-sm text-gray-600">💳 {order.payment_method || 'Non renseigné'}</p>
                  
                  {order.order_items && order.order_items.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="font-semibold text-sm mb-2">Produits :</p>
                      <div className="space-y-2">
                        {order.order_items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.products?.name} x {item.quantity}</span>
                            <span className="font-semibold">{(item.quantity * item.unit_price).toLocaleString()} FCFA</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 bg-gray-50 flex justify-between items-center">
                <select
                  value={order.status}
                  onChange={(e) => updateStatus(order.id, e.target.value)}
                  className="px-3 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                >
                  <option value="pending">🟡 En attente</option>
                  <option value="processing">🔵 En préparation</option>
                  <option value="shipped">🟣 Expédiée</option>
                  <option value="delivered">🟢 Livrée</option>
                  <option value="cancelled">🔴 Annulée</option>
                </select>
                <Link
                  href={`/admin/messages?user=${order.buyer_id}`}
                  className="text-blue-600 text-sm hover:underline"
                >
                  💬 Contacter le client
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Aucune commande trouvée
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Chargement...</div>}>
      <AdminOrdersContent />
    </Suspense>
  );
}