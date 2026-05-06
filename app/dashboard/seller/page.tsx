'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SellerDashboard() {
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalOrders: 0,
    pendingOrders: 0,
    lowStock: 0,
    heldAmount: 0, // nouveau
  });
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) {
        router.push('/auth/login');
        return;
      }

      setUserId(user.user.id);

      // Récupérer le profil du vendeur (incluant wallet_balance)
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, wallet_balance')
        .eq('id', user.user.id)
        .single();
      setSellerProfile(profile);

      // 1. Récupérer les produits du vendeur
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.user.id)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Erreur produits:', productsError);
      }

      const productsList = productsData || [];
      setProducts(productsList);
      
      const totalProducts = productsList.length;
      const lowStock = productsList.filter(p => p.stock <= 5 && p.stock > 0).length;

      // 2. Récupérer les IDs des produits
      const productIds = productsList.map(p => p.id);

      let ordersList: any[] = [];
      let totalSales = 0;
      let totalOrders = 0;
      let pendingOrders = 0;
      let heldAmount = 0;

      // 3. Récupérer les commandes si le vendeur a des produits
      if (productIds.length > 0) {
        const { data: orderItemsData, error: orderItemsError } = await supabase
          .from('order_items')
          .select(`
            quantity,
            unit_price,
            product_id,
            order:orders (
              id,
              created_at,
              total_amount,
              delivery_address,
              payment_method,
              payment_status,
              status,
              buyer_id
            ),
            product:products (
              name,
              image_urls
            )
          `)
          .in('product_id', productIds);

        if (orderItemsError) {
          console.error('Erreur order_items:', orderItemsError);
        } else {
          console.log('Order items trouvés:', orderItemsData?.length);

          // Grouper par commande
          const ordersMap = new Map();
          
          orderItemsData?.forEach((item: any) => {
            const order = item.order;
            if (order && !ordersMap.has(order.id)) {
              ordersMap.set(order.id, {
                id: order.id,
                created_at: order.created_at,
                total_amount: order.total_amount,
                delivery_address: order.delivery_address,
                payment_method: order.payment_method,
                payment_status: order.payment_status,
                status: order.status,
                buyer_id: order.buyer_id,
                buyer_name: null,
                buyer_email: null,
                buyer_phone: null,
                items: []
              });
            }
            if (order) {
              ordersMap.get(order.id).items.push({
                quantity: item.quantity,
                unit_price: item.unit_price,
                product: item.product
              });
            }
          });
          
          ordersList = Array.from(ordersMap.values());
          
          // Récupérer les noms des clients
          for (const order of ordersList) {
            if (order.buyer_id) {
              const { data: buyer } = await supabase
                .from('profiles')
                .select('full_name, email, phone')
                .eq('id', order.buyer_id)
                .single();
              order.buyer_name = buyer?.full_name || 'Client';
              order.buyer_email = buyer?.email;
              order.buyer_phone = buyer?.phone;
            }
          }
          
          setOrders(ordersList);
          
          totalOrders = ordersList.length;
          pendingOrders = ordersList.filter(o => o.status === 'pending').length;
          totalSales = ordersList.reduce((sum, o) => sum + (o.total_amount || 0), 0);
          // Calcul du montant en séquestre
          heldAmount = ordersList
            .filter(o => o.status === 'processing' && o.payment_status === 'held')
            .reduce((sum, o) => sum + (o.total_amount || 0), 0);
        }
      }

      // 4. Mettre à jour les stats
      setStats({
        totalProducts,
        totalSales,
        totalOrders,
        pendingOrders,
        lowStock,
        heldAmount,
      });

      // 5. Récupérer les messages non lus
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(full_name)')
        .eq('receiver_id', user.user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);
      setMessages(messagesData || []);

    } catch (err) {
      console.error('Erreur générale:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStock = async (productId: string, newStock: number) => {
    if (newStock < 0) return;
    await supabase.from('products').update({ stock: newStock }).eq('id', productId);
    fetchData();
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'processing': return 'En préparation';
      case 'shipped': return 'Expédiée';
      case 'delivered': return 'Livrée';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-green-700 to-green-600 -mx-4 md:-mx-8 px-4 md:px-8 py-8 mb-8 -mt-4 md:-mt-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-white">📊 Dashboard producteur</h1>
          <p className="text-green-100 mt-1">Vue d'ensemble de votre activité</p>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        
        {/* Cartes statistiques (7 colonnes sur desktop) */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition">
            <p className="text-gray-500 text-sm">Produits</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalProducts}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition">
            <p className="text-gray-500 text-sm">Commandes</p>
            <p className="text-2xl font-bold text-purple-600">{stats.totalOrders}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition">
            <p className="text-gray-500 text-sm">En attente</p>
            <p className="text-2xl font-bold text-orange-600">{stats.pendingOrders}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition">
            <p className="text-gray-500 text-sm">Stock faible</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition">
            <p className="text-gray-500 text-sm">Chiffre d'affaires</p>
            <p className="text-2xl font-bold text-green-600">{stats.totalSales.toLocaleString()} FCFA</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-purple-500 hover:shadow-md transition">
            <p className="text-gray-500 text-sm">💰 Portefeuille</p>
            <p className="text-2xl font-bold text-purple-600">{sellerProfile?.wallet_balance?.toLocaleString() || 0} FCFA</p>
          </div>
          {/* Nouvelle carte : Montant en séquestre */}
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-500 hover:shadow-md transition">
            <p className="text-gray-500 text-sm">⏳ En attente (séquestre)</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.heldAmount.toLocaleString()} FCFA</p>
            <p className="text-xs text-gray-400">Disponible après livraison</p>
          </div>
        </div>

        {/* Actions rapides (inchangées) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Link
            href="/dashboard/seller/products/new"
            className="bg-green-600 text-white text-center p-4 rounded-xl hover:bg-green-700 transition flex items-center justify-center gap-2"
          >
            <span className="text-xl">+</span> Ajouter un produit
          </Link>
          <Link
            href={userId ? `/seller/${userId}` : '#'}
            className="bg-blue-600 text-white text-center p-4 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            👁️ Voir ma boutique
          </Link>
          <Link
            href="/messages"
            className="bg-purple-600 text-white text-center p-4 rounded-xl hover:bg-purple-700 transition flex items-center justify-center gap-2"
          >
            💬 Messages {messages.length > 0 && `(${messages.length} nouveau(x))`}
          </Link>
          <Link
            href="/dashboard/seller/orders"
            className="bg-orange-600 text-white text-center p-4 rounded-xl hover:bg-orange-700 transition flex items-center justify-center gap-2"
          >
            🛒 Gérer les commandes ({stats.pendingOrders} en attente)
          </Link>
        </div>

        {/* Le reste de la page (produits récents, commandes récentes, messages, etc.) reste strictement identique */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne principale - Produits récents */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">📦 Derniers produits</h2>
                <Link href="/dashboard/seller/products" className="text-green-600 text-sm hover:underline">
                  Voir tout →
                </Link>
              </div>
              {products.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Vous n'avez pas encore de produits.</p>
                  <Link href="/dashboard/seller/products/new" className="text-green-600 mt-2 inline-block">
                    Ajouter votre premier produit
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {products.slice(0, 5).map((product) => (
                    <div key={product.id} className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-3">
                        {product.image_urls?.[0] && (
                          <img src={product.image_urls[0]} alt={product.name} className="w-12 h-12 object-cover rounded" />
                        )}
                        <div>
                          <p className="font-semibold">{product.name}</p>
                          <p className="text-sm text-green-600">{product.price.toLocaleString()} FCFA</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateStock(product.id, (product.stock || 0) - 1)}
                            className="w-6 h-6 bg-gray-200 rounded hover:bg-gray-300"
                            disabled={product.stock <= 0}
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm">{product.stock || 0}</span>
                          <button
                            onClick={() => updateStock(product.id, (product.stock || 0) + 1)}
                            className="w-6 h-6 bg-gray-200 rounded hover:bg-gray-300"
                          >
                            +
                          </button>
                        </div>
                        <Link
                          href={`/dashboard/seller/products/edit/${product.id}`}
                          className="text-blue-600 text-sm hover:underline"
                        >
                          Modifier
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">🛒 Commandes récentes</h2>
              {orders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucune commande reçue pour le moment.
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <p className="text-sm text-gray-500">
                            {new Date(order.created_at).toLocaleDateString('fr-FR')}
                          </p>
                          <p className="text-xs text-gray-400">N° {order.id.slice(0, 8)}</p>
                          {order.buyer_name && (
                            <p className="text-xs text-gray-500 mt-1">👤 {order.buyer_name}</p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                        <p className="font-bold text-green-600">{order.total_amount?.toLocaleString()} FCFA</p>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        {order.items?.slice(0, 2).map((item: any, idx: number) => (
                          <p key={idx}>{item.product?.name} x {item.quantity}</p>
                        ))}
                        {order.items?.length > 2 && <p className="text-xs">+{order.items.length - 2} autre(s)</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Colonne latérale - Messages et conseils */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">💬 Messages récents</h2>
              {messages.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">Aucun nouveau message</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <Link
                      key={msg.id}
                      href={`/messages/${msg.sender_id}`}
                      className="block p-3 bg-green-50 rounded-lg hover:bg-green-100 transition"
                    >
                      <p className="font-semibold text-sm">{msg.sender?.full_name || 'Client'}</p>
                      <p className="text-gray-600 text-sm truncate">{msg.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(msg.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
              <Link href="/messages" className="block text-center mt-4 text-green-600 text-sm hover:underline">
                Voir tous les messages →
              </Link>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
              <h3 className="font-bold text-gray-800 mb-3">💡 Astuce du jour</h3>
              <p className="text-sm text-gray-600 mb-3">
                Ajoutez des photos de qualité pour vos produits. Les articles avec photos sont <strong>3 fois plus vendus</strong> !
              </p>
              <Link href="/dashboard/seller/products/new" className="text-green-600 text-sm font-semibold">
                + Ajouter un produit →
              </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-gray-800 mb-3">📈 Taux de conversion</h3>
              <p className="text-2xl font-bold text-green-600">
                {stats.totalOrders > 0 && stats.totalProducts > 0
                  ? Math.round((stats.totalOrders / stats.totalProducts) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Commandes par rapport aux produits</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}