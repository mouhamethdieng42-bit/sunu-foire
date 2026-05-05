'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BuyerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // État pour le formulaire d'édition
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      router.push('/auth/login?redirect=/buyer/dashboard');
      return;
    }

    setUser(currentUser);

    // Profil – on récupère aussi wallet_balance
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*, wallet_balance')
      .eq('id', currentUser.id)
      .single();
    setProfile(profileData);
    setEditName(profileData?.full_name || '');
    setEditPhone(profileData?.phone || '');
    setEditEmail(currentUser.email || '');

    // Commandes
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, order_items(*, products(*))')
      .eq('buyer_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setOrders(ordersData || []);

    // Messages non lus
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(full_name)')
      .eq('receiver_id', currentUser.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    setMessages(messagesData || []);

    // Favoris
    const { data: wishlistData } = await supabase
      .from('wishlist')
      .select('*, products(*)')
      .eq('user_id', currentUser.id);
    setWishlist(wishlistData || []);

    // Adresses
    const { data: addressesData } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('is_default', { ascending: false });
    setAddresses(addressesData || []);

    setLoading(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editName, phone: editPhone })
      .eq('id', user.id);

    if (!error) {
      setProfile({ ...profile, full_name: editName, phone: editPhone });
      setEditing(false);
      alert('✅ Informations mises à jour');
    } else {
      alert('Erreur: ' + error.message);
    }
    setSaving(false);
  };

  const removeFromWishlist = async (productId: string) => {
    await supabase.from('wishlist').delete().eq('user_id', user.id).eq('product_id', productId);
    fetchAllData();
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
      case 'pending': return 'text-orange-600 bg-orange-50';
      case 'processing': return 'text-blue-600 bg-blue-50';
      case 'shipped': return 'text-purple-600 bg-purple-50';
      case 'delivered': return 'text-green-600 bg-green-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        
        {/* En-tête avec dégradé */}
        <div className="bg-gradient-to-r from-green-700 to-green-600 -mx-4 md:-mx-8 px-4 md:px-8 py-8 mb-8 -mt-4 md:-mt-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-white">👋 Bonjour, {profile?.full_name || 'Acheteur'} !</h1>
            <p className="text-green-100 mt-1">Bienvenue sur votre espace personnel</p>
          </div>
        </div>

        {/* Cartes statistiques + solde */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition">
            <p className="text-gray-500 text-sm">Commandes</p>
            <p className="text-2xl font-bold text-blue-600">{orders.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition">
            <p className="text-gray-500 text-sm">Livrées</p>
            <p className="text-2xl font-bold text-green-600">{orders.filter(o => o.status === 'delivered').length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition">
            <p className="text-gray-500 text-sm">Messages</p>
            <p className="text-2xl font-bold text-orange-600">{messages.length} non lus</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition">
            <p className="text-gray-500 text-sm">Favoris</p>
            <p className="text-2xl font-bold text-purple-600">{wishlist.length}</p>
          </div>
          {/* Solde du portefeuille */}
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500 hover:shadow-md transition">
            <p className="text-gray-500 text-sm">💰 Portefeuille</p>
            <p className="text-2xl font-bold text-green-600">{profile?.wallet_balance?.toLocaleString() || 0} FCFA</p>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Link href="/products" className="bg-green-600 text-white text-center p-3 rounded-xl hover:bg-green-700 transition text-sm">
            🛒 Découvrir
          </Link>
          <Link href="/messages" className="bg-blue-600 text-white text-center p-3 rounded-xl hover:bg-blue-700 transition text-sm">
            💬 Messages {messages.length > 0 && `(${messages.length})`}
          </Link>
          <Link href="/account/orders" className="bg-purple-600 text-white text-center p-3 rounded-xl hover:bg-purple-700 transition text-sm">
            📦 Commandes
          </Link>
          <Link href="/favorites" className="bg-pink-600 text-white text-center p-3 rounded-xl hover:bg-pink-700 transition text-sm">
            ❤️ Favoris ({wishlist.length})
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Colonne principale - Commandes récentes */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">📦 Dernières commandes</h2>
              {orders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Vous n'avez pas encore passé de commande.</p>
                  <Link href="/products" className="text-green-600 mt-2 inline-block">
                    Commencez vos achats →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="border rounded-lg p-3 hover:bg-gray-50 transition">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <p className="text-sm text-gray-500">
                            {new Date(order.created_at).toLocaleDateString('fr-FR')}
                          </p>
                          <p className="text-xs text-gray-400">N° {order.id.slice(0, 8)}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                        <p className="font-bold text-green-600">{order.total_amount.toLocaleString()} FCFA</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Liste de souhaits - aperçu */}
            {wishlist.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">❤️ Mes favoris</h2>
                  <Link href="/favorites" className="text-green-600 text-sm hover:underline">
                    Voir tout →
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {wishlist.slice(0, 6).map((item) => (
                    <div key={item.id} className="border rounded-lg p-2 relative">
                      <img
                        src={item.products?.image_urls?.[0] || '/placeholder.jpg'}
                        alt={item.products?.name}
                        className="w-full h-24 object-cover rounded mb-2"
                      />
                      <p className="font-semibold text-sm truncate">{item.products?.name}</p>
                      <p className="text-green-600 text-xs">{item.products?.price?.toLocaleString()} FCFA</p>
                      <button
                        onClick={() => removeFromWishlist(item.product_id)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs hover:bg-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Colonne latérale - Profil et adresses */}
          <div className="space-y-6">
            
            {/* Carte profil modifiable */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">👤 Mon profil</h2>
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="text-green-600 text-sm hover:underline">
                    ✏️ Modifier
                  </button>
                ) : (
                  <button onClick={() => setEditing(false)} className="text-gray-500 text-sm">
                    Annuler
                  </button>
                )}
              </div>

              {!editing ? (
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">Nom :</span> {profile?.full_name || '—'}</p>
                  <p><span className="text-gray-500">Email :</span> {user?.email}</p>
                  <p><span className="text-gray-500">Téléphone :</span> {profile?.phone || '—'}</p>
                  <p><span className="text-gray-500">Membre depuis :</span> {new Date(profile?.created_at).toLocaleDateString('fr-FR')}</p>
                  <p><span className="text-gray-500">💰 Solde :</span> <span className="font-semibold text-green-700">{profile?.wallet_balance?.toLocaleString()} FCFA</span></p>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nom complet"
                    className="w-full p-2 border rounded"
                  />
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full p-2 border rounded bg-gray-100"
                    disabled
                  />
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Téléphone"
                    className="w-full p-2 border rounded"
                  />
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? 'Enregistrement...' : '💾 Enregistrer'}
                  </button>
                  <p className="text-xs text-gray-400 text-center">L'email ne peut pas être modifié ici</p>
                </div>
              )}
            </div>

            {/* Adresses */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">📍 Mes adresses</h2>
              {addresses.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">Aucune adresse enregistrée</p>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="border rounded-lg p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-semibold">{addr.name}</span>
                        {addr.is_default && <span className="text-green-600 text-xs">✅ Par défaut</span>}
                      </div>
                      <p className="text-gray-600 mt-1">{addr.address}</p>
                      <p className="text-gray-500 text-xs">{addr.city}</p>
                    </div>
                  ))}
                </div>
              )}
              <Link
                href="/account/addresses"
                className="block text-center mt-3 text-green-600 text-sm hover:underline"
              >
                + Ajouter une adresse
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}