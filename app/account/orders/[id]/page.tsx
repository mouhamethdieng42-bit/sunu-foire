'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  products: {
    name: string;
    image_urls: string[];
  };
};

type Order = {
  id: string;
  total_amount: number;
  delivery_address: string;
  phone: string;
  payment_method: string;
  payment_status: string;
  status: string;
  created_at: string;
  order_items: OrderItem[];
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          products (name, image_urls)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error(error);
      alert('Erreur lors du chargement de la commande');
      router.push('/account/orders');
    } else {
      setOrder(data);
    }
    setLoading(false);
  };

  const confirmDelivery = async () => {
    if (!confirm('Avez-vous bien reçu tous les articles de cette commande ? Le vendeur sera payé après confirmation.')) return;

    setConfirming(true);

    // Récupérer le token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      alert('Erreur de session : ' + sessionError.message);
      setConfirming(false);
      return;
    }
    if (!session) {
      alert('Vous devez être connecté. Veuillez vous reconnecter.');
      setConfirming(false);
      return;
    }
    const token = session.access_token;
    if (!token) {
      alert('Token manquant. Veuillez vous reconnecter.');
      setConfirming(false);
      return;
    }

    // Appel API
    let data;
    try {
      const res = await fetch('/api/orders/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: id }),
      });

      data = await res.json();

      if (res.ok) {
        alert('✅ Confirmation enregistrée. Merci ! Le vendeur va être payé.');
        router.push('/account/orders');
      } else {
        alert(`Erreur : ${data.error || 'Une erreur est survenue'}`);
      }
    } catch (err) {
      console.error('Erreur réseau ou JSON:', err);
      alert('Erreur technique. Vérifiez votre connexion ou réessayez.');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement de la commande...</div>;
  }

  if (!order) {
    return <div className="p-8 text-center">Commande introuvable</div>;
  }

  const isWalletHeld = order.payment_method === 'wallet' && order.payment_status === 'held' && order.status === 'processing';
  const canConfirm = isWalletHeld;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Détail de la commande</h1>
      <p className="text-gray-500 text-sm mb-6">Référence : {order.id.slice(0, 12)}…</p>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Statut :</span> <span className="font-semibold capitalize">{order.status}</span></div>
          <div>
            <span className="text-gray-500">Paiement :</span> <span className="font-semibold capitalize">{order.payment_method}</span>
            {order.payment_status === 'held' && (
              <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">(séquestre)</span>
            )}
          </div>
          <div><span className="text-gray-500">Date :</span> {new Date(order.created_at).toLocaleString('fr-FR')}</div>
          <div><span className="text-gray-500">Total :</span> <span className="font-bold text-green-600">{order.total_amount.toLocaleString()} FCFA</span></div>
          <div className="col-span-2">
            <span className="text-gray-500">Livraison :</span> {order.delivery_address} (Tél: {order.phone})
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold mb-4">Articles commandés</h2>
        <div className="space-y-4">
          {order.order_items.map((item) => (
            <div key={item.id} className="flex gap-4 border-b pb-3 last:border-0">
              {item.products?.image_urls?.[0] && (
                <img
                  src={item.products.image_urls[0]}
                  alt={item.products.name}
                  className="w-16 h-16 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold">{item.products?.name}</h3>
                <p className="text-sm text-gray-600">{item.quantity} x {item.unit_price.toLocaleString()} FCFA</p>
              </div>
              <div className="font-semibold">
                {(item.quantity * item.unit_price).toLocaleString()} FCFA
              </div>
            </div>
          ))}
        </div>
      </div>

      {canConfirm && (
        <div className="mt-8 text-center">
          <button
            onClick={confirmDelivery}
            disabled={confirming}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition disabled:opacity-50"
          >
            {confirming ? 'Traitement...' : '📦 J’ai reçu ma commande (libérer les fonds)'}
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Une fois confirmé, le vendeur sera payé et vous ne pourrez plus revenir en arrière.
          </p>
        </div>
      )}
    </div>
  );
}