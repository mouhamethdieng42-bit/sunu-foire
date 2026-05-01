'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewMessagePage() {
  const searchParams = useSearchParams();
  const receiverId = searchParams.get('receiver_id');
  const productId = searchParams.get('product_id');
  const productName = searchParams.get('product_name');
  const router = useRouter();
  
  const [message, setMessage] = useState('');
  const [senderId, setSenderId] = useState<string | null>(null);
  const [receiver, setReceiver] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getUser();
    if (receiverId) getReceiver();
  }, []);

  const getUser = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.push('/auth/login?redirect=/messages/new');
      return;
    }
    setSenderId(data.user.id);
  };

  const getReceiver = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', receiverId)
      .single();
    if (data) setReceiver(data);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    if (!senderId || !receiverId) return;

    setLoading(true);
    const { error } = await supabase.from('messages').insert({
      sender_id: senderId,
      receiver_id: receiverId,
      product_id: productId,
      message: message.trim(),
    });

    if (error) {
      alert('Erreur: ' + error.message);
    } else {
      router.push('/messages');
    }
    setLoading(false);
  };

  if (!receiverId) {
    return <div className="p-8 text-center">Destinataire non spécifié</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <Link href="/products" className="text-blue-600 hover:underline mb-4 inline-block">
        ← Retour au catalogue
      </Link>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-green-700 text-white p-4">
          <h1 className="text-xl font-bold">💬 Nouveau message</h1>
          <p className="text-green-100 text-sm mt-1">
            À : {receiver?.full_name || 'Producteur'}
          </p>
          {productName && (
            <p className="text-green-100 text-xs mt-1">
              Produit : {productName}
            </p>
          )}
        </div>

        <form onSubmit={sendMessage} className="p-6 space-y-4">
          <textarea
            placeholder="Écrivez votre message ici..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={5}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {loading ? 'Envoi...' : '📤 Envoyer le message'}
          </button>
        </form>
      </div>
    </div>
  );
}