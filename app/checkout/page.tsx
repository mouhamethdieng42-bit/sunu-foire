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
  const router = useRouter();

  // Vérifier si l'utilisateur est connecté
  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      router.push('/auth/login?redirect=/checkout');
    }
  };

  // Créer la commande en mode test avec commission
  const createTestOrder = async () => {
    if (!address || !phone) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);

    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      router.push('/auth/login?redirect=/checkout');
      setLoading(false);
      return;
    }

    // Calcul de la commission (1%) - cachée pour l'acheteur
    const commission = Math.floor(totalPrice * 0.01);
    const sellerAmount = totalPrice - commission;

    // Créer la commande avec commission
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        buyer_id: user.user.id,
        total_amount: totalPrice,
        delivery_address: address,
        phone: phone,
        payment_method: 'test',
        status: 'test',
        commission: commission,
        seller_amount: sellerAmount,
      })
      .select()
      .single();

    if (error) {
      alert('Erreur: ' + error.message);
      setLoading(false);
      return;
    }

    // Créer les articles de commande
    for (const item of items) {
      await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
      });
    }

    // Vider le panier
    clearCart();
    
    alert('✅ Commande test créée avec succès !');
    router.push('/account/orders');
    
    setLoading(false);
  };

  if (items.length === 0) {
    router.push('/cart');
    return null;
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold mb-6">Validation de commande</h1>

      {/* Mode test - bandeau */}
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 p-3 rounded mb-4 text-sm">
        ⚠️ <strong>Mode test actif</strong> - Aucun paiement réel n'est effectué.
      </div>

      {/* Récapitulatif - sans afficher la commission */}
      <div className="bg-gray-50 p-4 rounded mb-6">
        <h2 className="font-semibold mb-2">Récapitulatif</h2>
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm mb-1">
            <span>{item.name} x {item.quantity}</span>
            <span>{item.price * item.quantity} FCFA</span>
          </div>
        ))}
        <div className="border-t pt-2 mt-2 font-bold flex justify-between">
          <span>Total à payer</span>
          <span>{totalPrice.toLocaleString()} FCFA</span>
        </div>
      </div>

      {/* Formulaire */}
      <div className="space-y-4">
        <input
          type="tel"
          placeholder="Téléphone (pour la livraison)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />

        <textarea
          placeholder="Adresse de livraison"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full p-2 border rounded"
          rows={3}
          required
        />

        <button
          onClick={createTestOrder}
          disabled={loading}
          className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? 'Création...' : '📦 Commander (mode test - gratuit)'}
        </button>
      </div>
    </div>
  );
}