'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceSettings, setInvoiceSettings] = useState<any>({});
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
    fetchInvoiceSettings();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [statusFilter, dateFilter, searchTerm, orders]);

  const fetchOrders = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      router.push('/auth/login');
      return;
    }

    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          quantity,
          unit_price,
          product_id,
          products (
            id,
            name,
            image_urls,
            seller_id,
            seller_phone,
            profiles!products_seller_id_fkey (
              id,
              full_name,
              phone,
              email
            )
          )
        )
      `)
      .eq('buyer_id', user.user.id)
      .order('created_at', { ascending: false });

    setOrders(data || []);
    setLoading(false);
  };

  const fetchInvoiceSettings = async () => {
    const { data } = await supabase.from('settings').select('key, value');
    const settingsMap: any = {};
    data?.forEach((s: any) => {
      try {
        settingsMap[s.key] = JSON.parse(s.value);
      } catch {
        settingsMap[s.key] = s.value;
      }
    });
    setInvoiceSettings(settingsMap);
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const threeMonthsAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        if (dateFilter === 'today') return orderDate >= today;
        if (dateFilter === 'week') return orderDate >= weekAgo;
        if (dateFilter === 'month') return orderDate >= monthAgo;
        if (dateFilter === '3months') return orderDate >= threeMonthsAgo;
        return true;
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredOrders(filtered);
  };

  const getStatusInfo = (status: string) => {
    const config = {
      pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: '🟡' },
      processing: { label: 'En préparation', color: 'bg-blue-100 text-blue-800', icon: '🔵' },
      shipped: { label: 'Expédiée', color: 'bg-purple-100 text-purple-800', icon: '📦' },
      delivered: { label: 'Livrée', color: 'bg-green-100 text-green-800', icon: '🎉' },
      cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800', icon: '❌' },
    };
    return config[status as keyof typeof config] || config.pending;
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffDays = Math.floor((now.getTime() - past.getTime()) / 86400000);
    if (diffDays === 0) return "aujourd'hui";
    if (diffDays === 1) return 'hier';
    return `il y a ${diffDays} jours`;
  };

  const getInvoiceNumber = (orderId: string, date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const sequential = orderId.slice(0, 8);
    return `FV-${year}${month}-${sequential}`;
  };

  const downloadPDF = (order: any) => {
    const doc = new jsPDF();
    const date = new Date(order.created_at);
    const invoiceNumber = getInvoiceNumber(order.id, date);
    const orderItems = order.order_items || [];
    const totalHT = order.total_amount;
    const tvaRate = parseFloat(invoiceSettings.invoice_tva_rate || '18');
    const tva = Math.round(totalHT * tvaRate / 100);
    const timbre = parseInt(invoiceSettings.invoice_timbre || '1000');
    const totalTTC = totalHT + tva + timbre;

    // Logo et en-tête
    doc.setFontSize(20);
    doc.setTextColor(21, 128, 61);
    doc.text('🌾 SUNU FOIRE', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`NINEA: ${invoiceSettings.invoice_ninea || '123456789'}`, 14, 30);
    doc.text(`RC: ${invoiceSettings.invoice_rc || 'SN-DKR-2025-00123'}`, 14, 36);
    doc.text(invoiceSettings.invoice_address || 'Villa N°15, Sacré Cœur 3, Dakar, Sénégal', 14, 42);
    doc.text(`📞 ${invoiceSettings.invoice_phone || '76 858 87 88'} | 📧 ${invoiceSettings.invoice_email || 'contact@sunu-foire.sn'}`, 14, 48);

    // Titre facture
    doc.setFontSize(16);
    doc.setTextColor(21, 128, 61);
    doc.text('FACTURE PROFORMA', 14, 65);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`N° Facture: ${invoiceNumber}`, 14, 75);
    doc.text(`Date: ${date.toLocaleDateString('fr-FR')}`, 14, 81);
    doc.text(`N° Commande: ${order.id}`, 14, 87);

    // Client
    doc.setFontSize(11);
    doc.text('CLIENT', 14, 100);
    doc.setFontSize(10);
    doc.text(`Nom: ${order.buyer_name || 'Client'}`, 14, 108);
    doc.text(`Adresse: ${order.delivery_address}`, 14, 114);
    doc.text(`Paiement: ${order.payment_method || 'Non renseigné'}`, 14, 120);

    // Tableau des produits
    const tableData = orderItems.map((item: any, idx: number) => [
      idx + 1,
      item.products?.name || 'Produit',
      item.quantity,
      `${item.unit_price.toLocaleString()} FCFA`,
      `${(item.quantity * item.unit_price).toLocaleString()} FCFA`,
    ]);

    autoTable(doc, {
      startY: 135,
      head: [['N°', 'Désignation', 'Qté', 'PU', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [21, 128, 61], textColor: [255, 255, 255] },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 160;

    // Totaux
    doc.setFontSize(10);
    doc.text(`Total HT: ${totalHT.toLocaleString()} FCFA`, 140, finalY + 10);
    doc.text(`TVA (${tvaRate}%): ${tva.toLocaleString()} FCFA`, 140, finalY + 18);
    doc.text(`Timbre fiscal: ${timbre.toLocaleString()} FCFA`, 140, finalY + 26);
    doc.setFontSize(11);
    doc.setTextColor(21, 128, 61);
    doc.text(`TOTAL À PAYER: ${totalTTC.toLocaleString()} FCFA`, 140, finalY + 38);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Arrêtée à la présente facture', 14, 270);
    doc.text('Signature client', 14, 280);
    doc.text('Cachet et signature', 150, 280);

    doc.save(`Facture_${invoiceNumber}.pdf`);
  };

  const downloadCSV = (order: any) => {
    const orderItems = order.order_items || [];
    const totalHT = order.total_amount;
    const tvaRate = parseFloat(invoiceSettings.invoice_tva_rate || '18');
    const tva = Math.round(totalHT * tvaRate / 100);
    const timbre = parseInt(invoiceSettings.invoice_timbre || '1000');
    const totalTTC = totalHT + tva + timbre;

    const headers = ['Désignation', 'Quantité', 'Prix Unitaire', 'Total HT'];
    const rows = orderItems.map((item: any) => [
      item.products?.name || 'Produit',
      item.quantity,
      item.unit_price.toLocaleString(),
      (item.quantity * item.unit_price).toLocaleString(),
    ]);

    rows.push(['', '', '', '']);
    rows.push(['', '', 'Total HT', totalHT.toLocaleString()]);
    rows.push(['', '', `TVA (${tvaRate}%)`, tva.toLocaleString()]);
    rows.push(['', '', 'Timbre fiscal', timbre.toLocaleString()]);
    rows.push(['', '', 'TOTAL TTC', totalTTC.toLocaleString()]);

    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Facture_${getInvoiceNumber(order.id, new Date(order.created_at))}.csv`;
    link.click();
  };

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-green-700 to-green-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-2xl md:text-3xl font-bold">📦 Mes commandes</h1>
          <p className="text-green-100 mt-1">Suivez l'état de vos achats</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          <div className="bg-white p-3 rounded-xl shadow-sm text-center"><p className="text-xl font-bold text-blue-600">{stats.total}</p><p className="text-xs text-gray-500">Total</p></div>
          <div className="bg-white p-3 rounded-xl shadow-sm text-center"><p className="text-xl font-bold text-yellow-600">{stats.pending}</p><p className="text-xs text-gray-500">Attente</p></div>
          <div className="bg-white p-3 rounded-xl shadow-sm text-center"><p className="text-xl font-bold text-blue-600">{stats.processing}</p><p className="text-xs text-gray-500">Préparation</p></div>
          <div className="bg-white p-3 rounded-xl shadow-sm text-center"><p className="text-xl font-bold text-purple-600">{stats.shipped}</p><p className="text-xs text-gray-500">Expédiée</p></div>
          <div className="bg-white p-3 rounded-xl shadow-sm text-center"><p className="text-xl font-bold text-green-600">{stats.delivered}</p><p className="text-xs text-gray-500">Livrée</p></div>
          <div className="bg-white p-3 rounded-xl shadow-sm text-center"><p className="text-xl font-bold text-red-600">{stats.cancelled}</p><p className="text-xs text-gray-500">Annulée</p></div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
          <div className="flex flex-wrap gap-4">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border rounded-lg">
              <option value="all">Tous statuts</option>
              <option value="pending">🟡 En attente</option>
              <option value="processing">🔵 En préparation</option>
              <option value="shipped">🟣 Expédiée</option>
              <option value="delivered">🟢 Livrée</option>
              <option value="cancelled">🔴 Annulée</option>
            </select>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-4 py-2 border rounded-lg">
              <option value="all">Toutes dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">7 jours</option>
              <option value="month">30 jours</option>
              <option value="3months">90 jours</option>
            </select>
            <input type="text" placeholder="🔍 N° commande..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 px-4 py-2 border rounded-lg" />
            <button onClick={() => { setStatusFilter('all'); setDateFilter('all'); setSearchTerm(''); }} className="px-4 py-2 bg-gray-500 text-white rounded-lg">Réinitialiser</button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <div className="text-6xl mb-4">🛒</div>
            <h3 className="text-lg font-semibold text-gray-700">Aucune commande trouvée</h3>
            <Link href="/products" className="inline-block mt-4 bg-green-600 text-white px-6 py-2 rounded-lg">Découvrir les produits</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              const isExpanded = expandedOrder === order.id;
              const totalItems = order.order_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

              return (
                <div key={order.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b bg-gray-50">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2"><span className="text-xs text-gray-500">Commande du</span><span className="font-semibold">{new Date(order.created_at).toLocaleDateString('fr-FR')}</span><span className="text-xs text-gray-400">({getTimeAgo(order.created_at)})</span></div>
                        <p className="text-xs text-gray-400 font-mono mt-1">N° {order.id.slice(0, 8)}</p>
                      </div>
                      <div className="text-right"><p className="text-2xl font-bold text-green-600">{order.total_amount.toLocaleString()} FCFA</p><p className="text-xs text-gray-500">{totalItems} article(s)</p></div>
                    </div>
                  </div>

                  <div className="p-4 border-b flex justify-between items-center"><span className="text-sm font-medium text-gray-700">Statut</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>{statusInfo.icon} {statusInfo.label}</span></div>

                  <div className="p-4">
                    <div className="space-y-3">
                      {order.order_items?.slice(0, isExpanded ? undefined : 2).map((item: any, idx: number) => (
                        <div key={idx} className="flex gap-3 items-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {item.products?.image_urls?.[0] ? <img src={item.products.image_urls[0]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🌾</div>}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{item.products?.name}</p>
                            <p className="text-sm text-gray-500">Qté: {item.quantity}</p>
                            <div className="flex gap-2 mt-1">
                              <Link href={`/messages/new?receiver_id=${item.products?.profiles?.id}&product_id=${item.products?.id}&product_name=${encodeURIComponent(item.products?.name)}`} className="text-blue-600 text-xs hover:underline">💬 Contacter vendeur</Link>
                            </div>
                          </div>
                          <p className="font-semibold text-green-600">{(item.quantity * item.unit_price).toLocaleString()} FCFA</p>
                        </div>
                      ))}
                      {order.order_items?.length > 2 && !isExpanded && (<button onClick={() => setExpandedOrder(order.id)} className="text-blue-600 text-sm hover:underline">+ {order.order_items.length - 2} autre(s)</button>)}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 border-t bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"><div><p className="font-semibold">📦 Livraison</p><p className="text-gray-600 mt-1">{order.delivery_address}</p></div>
                      <div><p className="font-semibold">💳 Paiement</p><p className="text-gray-600 mt-1">{order.payment_method || 'Non renseigné'}</p></div></div>
                    </div>
                  )}

                  <div className="p-3 bg-gray-50 flex flex-wrap justify-end gap-3">
                    <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)} className="text-blue-600 text-sm">{isExpanded ? '▲ Voir moins' : '▼ Voir détails'}</button>
                    <button onClick={() => downloadPDF(order)} className="text-red-600 text-sm">📄 PDF Facture</button>
                    <button onClick={() => downloadCSV(order)} className="text-green-600 text-sm">📊 CSV Export</button>
                    {order.status === 'delivered' && order.order_items?.map((item: any) => (<Link key={item.product_id} href={`/product/${item.product_id}`} className="text-green-600 text-sm">⭐ Laisser un avis</Link>))}
                    {order.status === 'pending' && (<button onClick={() => alert('Contacter le service client au 76 858 87 88')} className="text-red-600 text-sm">❌ Annuler</button>)}
                    <Link href="/products" className="text-blue-600 text-sm">🔄 Recommander</Link>
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