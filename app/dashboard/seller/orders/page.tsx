'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { sendOrderStatusNotification } from '@/lib/notifications';

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [searchTerm, statusFilter, dateFilter, orders]);

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items!inner (
            quantity,
            unit_price,
            product:products (
              id,
              name,
              image_urls,
              seller_id
            )
          )
        `)
        .eq('order_items.product.seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const buyerIds = ordersData.map(o => o.buyer_id).filter(Boolean);
      const { data: buyers } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', buyerIds);
      const buyerMap = new Map(buyers?.map(b => [b.id, b]) || []);

      const formattedOrders = ordersData.map(order => ({
        id: order.id,
        created_at: order.created_at,
        total_amount: order.total_amount,
        delivery_address: order.delivery_address,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        status: order.status,
        buyer_id: order.buyer_id,
        buyer_name: buyerMap.get(order.buyer_id)?.full_name || 'Client',
        buyer_email: buyerMap.get(order.buyer_id)?.email,
        buyer_phone: buyerMap.get(order.buyer_id)?.phone,
        items: order.order_items.map((item: any) => ({
          quantity: item.quantity,
          unit_price: item.unit_price,
          product: item.product
        }))
      }));

      setOrders(formattedOrders);
    } catch (err) {
      console.error('Erreur fetchOrders:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.buyer_email?.toLowerCase().includes(searchTerm.toLowerCase())
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

  const updateStatus = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);
    if (error) {
      alert('Erreur lors de la mise à jour');
      return;
    }

    if (order.buyer_email) {
      const notified = await sendOrderStatusNotification(
        order.buyer_id,
        orderId,
        newStatus,
        order.buyer_email,
        order.buyer_name
      );
      if (notified) {
        alert(`Commande mise à jour et client notifié`);
      } else {
        alert(`Commande mise à jour (notification non envoyée)`);
      }
    } else {
      alert(`Commande mise à jour`);
    }
    fetchOrders();
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: '🟡' },
      processing: { label: 'En préparation', color: 'bg-blue-100 text-blue-800', icon: '🔵' },
      shipped: { label: 'Expédiée', color: 'bg-purple-100 text-purple-800', icon: '🟣' },
      delivered: { label: 'Livrée', color: 'bg-green-100 text-green-800', icon: '🟢' },
      cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800', icon: '🔴' },
    };
    return config[status as keyof typeof config] || config.pending;
  };

  const exportToCSV = () => {
    const headers = ['N° Commande', 'Client', 'Email', 'Téléphone', 'Montant', 'Statut', 'Date', 'Adresse'];
    const rows = filteredOrders.map(order => [
      order.id.slice(0, 8),
      order.buyer_name,
      order.buyer_email || '',
      order.buyer_phone || '',
      order.total_amount,
      getStatusBadge(order.status).label,
      new Date(order.created_at).toLocaleDateString('fr-FR'),
      order.delivery_address
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `commandes_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const exportToJSON = () => {
    const data = filteredOrders.map(order => ({
      id: order.id,
      client: order.buyer_name,
      email: order.buyer_email,
      telephone: order.buyer_phone,
      montant: order.total_amount,
      statut: order.status,
      date: order.created_at,
      adresse: order.delivery_address,
      produits: order.items.map((item: any) => ({
        nom: item.product?.name,
        quantite: item.quantity,
        prix_unitaire: item.unit_price,
        total: item.quantity * item.unit_price
      }))
    }));
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `commandes_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const styles = `
      <style>
        body { font-family: Arial; margin: 20px; }
        h1 { color: #15803d; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #15803d; color: white; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .total { font-weight: bold; margin-top: 20px; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
      </style>
    `;
    const tableRows = filteredOrders.map(order => `
      <tr>
        <td>${order.id.slice(0, 8)}</td>
        <td>${order.buyer_name}</td>
        <td>${order.buyer_email || '-'}</td>
        <td>${order.total_amount.toLocaleString()} FCFA</td>
        <td>${getStatusBadge(order.status).label}</td>
        <td>${new Date(order.created_at).toLocaleDateString('fr-FR')}</td>
      </tr>
    `).join('');
    const totalAmount = filteredOrders.reduce((sum, o) => sum + o.total_amount, 0);
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>Commandes SUNU FOIRE</title>${styles}</head>
        <body>
          <h1>📦 SUNU FOIRE - Rapport des commandes</h1>
          <p><strong>Date d'export :</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Nombre de commandes :</strong> ${filteredOrders.length}</p>
          <p><strong>Statut filtré :</strong> ${statusFilter === 'all' ? 'Tous' : statusFilter}</p>
          <table>
            <thead><tr><th>N°</th><th>Client</th><th>Email</th><th>Montant</th><th>Statut</th><th>Date</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </tr>
          <p class="total">💰 Montant total : ${totalAmount.toLocaleString()} FCFA</p>
          <p class="footer">SUNU FOIRE - Suivi des commandes - Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const stats = {
    total: orders.length,
    totalAmount: orders.reduce((sum, o) => sum + o.total_amount, 0),
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  if (loading) return <div className="p-8 text-center">Chargement des commandes...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-green-700 to-green-600 -mx-4 md:-mx-8 px-4 md:px-8 py-6 mb-6 -mt-4 md:-mt-8">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">🛒 Commandes reçues</h1>
            <p className="text-green-100 mt-1">Gérez vos ventes et suivez vos livraisons</p>
          </div>
          <div className="flex gap-3">
            <button onClick={exportToCSV} className="bg-white text-green-700 px-4 py-2 rounded-lg hover:bg-green-50 transition flex items-center gap-2">📊 CSV</button>
            <button onClick={exportToPDF} className="bg-white text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition flex items-center gap-2">📄 PDF</button>
            <button onClick={exportToJSON} className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition flex items-center gap-2">📋 JSON</button>
            <Link href="/dashboard/seller" className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-400 transition">← Retour</Link>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
            <p className="text-gray-500 text-sm">Total commandes</p>
            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
            <p className="text-gray-500 text-sm">Chiffre d'affaires</p>
            <p className="text-2xl font-bold text-green-600">{stats.totalAmount.toLocaleString()} FCFA</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-500">
            <p className="text-gray-500 text-sm">En attente</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-purple-500">
            <p className="text-gray-500 text-sm">À traiter</p>
            <p className="text-2xl font-bold text-purple-600">{stats.processing + stats.pending}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">🔍 Rechercher</label>
              <input type="text" placeholder="Client ou N° commande..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">📊 Statut</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500">
                <option value="all">Tous les statuts</option>
                <option value="pending">🟡 En attente</option>
                <option value="processing">🔵 En préparation</option>
                <option value="shipped">🟣 Expédiée</option>
                <option value="delivered">🟢 Livrée</option>
                <option value="cancelled">🔴 Annulée</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">📅 Période</label>
              <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500">
                <option value="all">Toutes</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">7 derniers jours</option>
                <option value="month">30 derniers jours</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); setDateFilter('all'); }} className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">Réinitialiser</button>
            </div>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-semibold text-gray-700">Aucune commande trouvée</h3>
            <p className="text-gray-500 mt-1">Aucune commande ne correspond à vos critères</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const badge = getStatusBadge(order.status);
              const isExpanded = expandedOrder === order.id;
              const totalItems = order.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
              const isDisabled = order.status === 'delivered' || order.status === 'cancelled';
              return (
                <div key={order.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition">
                  <div className="p-4 border-b bg-gray-50">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gray-500">#{order.id.slice(0, 8)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>{badge.icon} {badge.label}</span>
                        </div>
                        <p className="font-semibold text-gray-800 mt-1">{order.buyer_name}</p>
                        <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">{order.total_amount.toLocaleString()} FCFA</p>
                        <p className="text-xs text-gray-400">{totalItems} article(s)</p>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 border-b bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div><p className="font-semibold text-gray-700">📦 Livraison</p><p className="text-gray-600">{order.delivery_address}</p></div>
                        <div><p className="font-semibold text-gray-700">💳 Paiement</p><p className="text-gray-600">{order.payment_method || 'Non renseigné'}</p></div>
                        <div><p className="font-semibold text-gray-700">👤 Client</p><p className="text-gray-600">{order.buyer_email || 'Non renseigné'}</p>{order.buyer_phone && <p className="text-gray-600">{order.buyer_phone}</p>}</div>
                      </div>
                    </div>
                  )}

                  <div className="p-4">
                    <div className="space-y-2">
                      {order.items?.slice(0, isExpanded ? undefined : 3).map((item: any, idx: number) => (
                        <div key={idx} className="flex gap-3 items-center">
                          {item.product?.image_urls?.[0] && <img src={item.product.image_urls[0]} alt={item.product.name} className="w-12 h-12 object-cover rounded" />}
                          <div className="flex-1"><p className="font-medium">{item.product?.name}</p><p className="text-sm text-gray-500">Qté: {item.quantity}</p></div>
                          <p className="font-semibold">{(item.quantity * item.unit_price).toLocaleString()} FCFA</p>
                        </div>
                      ))}
                      {order.items?.length > 3 && !isExpanded && (
                        <button onClick={() => setExpandedOrder(order.id)} className="text-blue-600 text-sm hover:underline">+ {order.items.length - 3} autre(s) produit(s)</button>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 flex justify-between items-center flex-wrap gap-2">
                    <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)} className="text-blue-600 text-sm hover:underline flex items-center gap-1">{isExpanded ? '▲ Voir moins' : '▼ Voir détails'}</button>
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                      disabled={isDisabled}
                    >
                      <option value="pending">🟡 En attente</option>
                      <option value="processing">🔵 En préparation</option>
                      <option value="shipped">🟣 Expédiée</option>
                      {!isDisabled && <option value="cancelled">🔴 Annulée (manuelle)</option>}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}