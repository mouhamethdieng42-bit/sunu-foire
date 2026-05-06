'use client';

import { useCart } from '@/context/CartContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card'>('wallet');
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (items.length === 0) router.push('/cart');
  }, [items, router]);

  useEffect(() => {
    checkUserAndBalance();
  }, []);

  const checkUserAndBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login?redirect=/checkout');
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();
    setBalance(profile?.wallet_balance || 0);
  };

  const createOrder = async () => {
    setError('');
    if (!address || !phone) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    if (paymentMethod === 'wallet' && balance < totalPrice) {
      setError(`Solde insuffisant (${balance.toLocaleString()} FCFA)`);
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login?redirect=/checkout');
      return;
    }

    // Récupérer le token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setError('Session expirée. Veuillez vous reconnecter.');
      setLoading(false);
      return;
    }

    const res = await fetch('/api/checkout/wallet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        buyer_id: user.id,
        total_amount: totalPrice,
        delivery_address: address,
        phone,
        payment_method: paymentMethod,
        items: items.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
        })),
      }),
    });

    const data = await res.json();
    if (res.ok) {
      clearCart();
      router.push(`/account/orders/${data.orderId}`);
    } else {
      setError(data.error || 'Erreur lors de la création de la commande');
    }
    setLoading(false);
  };

  if (items.length === 0) return <div className="p-8 text-center">Redirection...</div>;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold mb-6">Validation de commande</h1>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="font-semibold mb-2">Moyen de paiement</h2>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="radio" value="wallet" checked={paymentMethod === 'wallet'} onChange={() => setPaymentMethod('wallet')} />
            <span>💰 Payer avec mon portefeuille (solde : {balance.toLocaleString()} FCFA)</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" value="card" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} />
            <span>💳 Carte bancaire / Mobile Money (bientôt disponible)</span>
          </label>
        </div>
        {paymentMethod === 'card' && <div className="mt-2 text-xs text-gray-500">⚠️ Mode simulation – aucun vrai paiement.</div>}
      </div>

      <div className="bg-gray-50 p-4 rounded mb-6">
        <h2 className="font-semibold mb-2">Récapitulatif</h2>
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm mb-1">
            <span>{item.name} x {item.quantity}</span>
            <span>{item.price * item.quantity} FCFA</span>
          </div>
        ))}
        <div className="border-t pt-2 mt-2 font-bold flex justify-between">
          <span>Total</span>
          <span>{totalPrice.toLocaleString()} FCFA</span>
        </div>
      </div>

      <div className="space-y-4">
        <input type="tel" placeholder="Téléphone (pour la livraison)" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2 border rounded" required />
        <textarea placeholder="Adresse de livraison" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-2 border rounded" rows={3} required />
        <button onClick={createOrder} disabled={loading} className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:bg-gray-400">
          {loading ? 'Traitement...' : '📦 Confirmer la commande'}
        </button>
      </div>
    </div>
  );
}