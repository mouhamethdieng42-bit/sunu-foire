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
  const [pageLoading, setPageLoading] = useState(true);

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
    setPageLoading(false);
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

  if (pageLoading) return <div className="p-8 text-center">Chargement...</div>;
  if (!receiverId) return <div className="p-8 text-center">Destinataire non spécifié</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête (optionnel, pour rester cohérent) */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 -mx-4 md:-mx-8 px-4 md:px-8 py-6 mb-6 -mt-4 md:-mt-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-white">💬 Nouveau message</h1>
          <p className="text-green-100 mt-1">Contactez le vendeur directement</p>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <Link href={`/product/${productId}`} className="text-blue-600 hover:underline mb-4 inline-block">
          ← Retour au produit
        </Link>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-green-700 text-white p-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-green-700 text-xl">
                📧
              </div>
              <div>
                <h2 className="font-bold">Nouveau message</h2>
                <p className="text-green-100 text-sm">À : {receiver?.full_name || 'Producteur'}</p>
                {productName && (
                  <p className="text-green-100 text-xs mt-1">
                    Produit : {productName}
                  </p>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={sendMessage} className="p-5 space-y-4">
            <textarea
              placeholder="Écrivez votre message ici..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={6}
              required
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 rounded-xl hover:bg-green-700 transition disabled:opacity-50"
              >
                {loading ? 'Envoi...' : '📤 Envoyer le message'}
              </button>
              <Link
                href={`/product/${productId}`}
                className="flex-1 text-center bg-gray-200 text-gray-700 py-2 rounded-xl hover:bg-gray-300 transition"
              >
                Annuler
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}