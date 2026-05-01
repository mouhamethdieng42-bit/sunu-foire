'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MessagesPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      router.push('/auth/login?redirect=/messages');
      return;
    }

    const userId = user.user.id;

    // Récupérer les messages reçus
    const { data: received } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(id, full_name)')
      .eq('receiver_id', userId)
      .order('created_at', { ascending: false });

    // Récupérer les messages envoyés
    const { data: sent } = await supabase
      .from('messages')
      .select('*, receiver:profiles!messages_receiver_id_fkey(id, full_name)')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false });

    // Combiner et grouper par correspondant
    const allMessages = [...(received || []), ...(sent || [])];
    const conversationsMap = new Map();

    allMessages.forEach((msg) => {
      const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      const otherName = msg.sender_id === userId ? msg.receiver?.full_name : msg.sender?.full_name;
      
      if (!conversationsMap.has(otherId)) {
        conversationsMap.set(otherId, {
          id: otherId,
          name: otherName,
          lastMessage: msg.message,
          lastDate: msg.created_at,
          unread: msg.receiver_id === userId && !msg.is_read ? 1 : 0,
        });
      } else if (new Date(msg.created_at) > new Date(conversationsMap.get(otherId).lastDate)) {
        const conv = conversationsMap.get(otherId);
        conv.lastMessage = msg.message;
        conv.lastDate = msg.created_at;
        if (msg.receiver_id === userId && !msg.is_read) conv.unread += 1;
      }
    });

    setConversations(Array.from(conversationsMap.values()).sort((a, b) => 
      new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime()
    ));
    setLoading(false);
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">💬 Mes messages</h1>

      {conversations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Aucune conversation pour le moment.</p>
          <Link href="/products" className="text-green-600 mt-2 inline-block">
            Découvrir des produits
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/messages/${conv.id}`}
              className={`block p-4 bg-white border rounded-lg hover:shadow-md transition ${
                conv.unread > 0 ? 'border-green-500 bg-green-50' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{conv.name || 'Producteur'}</span>
                    {conv.unread > 0 && (
                      <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {conv.unread} nouveau(x)
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mt-1 line-clamp-1">
                    {conv.lastMessage}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(conv.lastDate).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}