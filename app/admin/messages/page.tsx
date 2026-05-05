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

    // Récupérer les messages reçus et envoyés
    const { data: received } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(id, full_name)')
      .eq('receiver_id', user.user.id)
      .order('created_at', { ascending: false });

    const { data: sent } = await supabase
      .from('messages')
      .select('*, receiver:profiles!messages_receiver_id_fkey(id, full_name)')
      .eq('sender_id', user.user.id)
      .order('created_at', { ascending: false });

    const allMessages = [...(received || []), ...(sent || [])];
    const conversationsMap = new Map();

    allMessages.forEach((msg) => {
      const otherId = msg.sender_id === user.user.id ? msg.receiver_id : msg.sender_id;
      const otherName = msg.sender_id === user.user.id ? msg.receiver?.full_name : msg.sender?.full_name;
      
      if (!conversationsMap.has(otherId)) {
        conversationsMap.set(otherId, {
          id: otherId,
          name: otherName,
          lastMessage: msg.message,
          lastDate: msg.created_at,
          unread: msg.receiver_id === user.user.id && !msg.is_read ? 1 : 0,
        });
      } else if (new Date(msg.created_at) > new Date(conversationsMap.get(otherId).lastDate)) {
        const conv = conversationsMap.get(otherId);
        conv.lastMessage = msg.message;
        conv.lastDate = msg.created_at;
        if (msg.receiver_id === user.user.id && !msg.is_read) conv.unread += 1;
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
    <div className="min-h-screen bg-gray-50">
      {/* En-tête avec dégradé (comme sur les autres pages) */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 -mx-4 md:-mx-8 px-4 md:px-8 py-6 mb-6 -mt-4 md:-mt-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-white">💬 Messages</h1>
          <p className="text-green-100 mt-1">Discutez avec les vendeurs et acheteurs</p>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        {conversations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500">Aucune conversation pour le moment.</p>
            <Link href="/products" className="text-green-600 mt-3 inline-block hover:underline">
              Découvrir des produits
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className={`block bg-white rounded-xl shadow-sm hover:shadow-md transition p-4 border ${
                  conv.unread > 0 ? 'border-green-500 bg-green-50' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800 text-base md:text-lg truncate">
                        {conv.name || 'Utilisateur'}
                      </span>
                      {conv.unread > 0 && (
                        <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                          {conv.unread} nouveau(x)
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mt-1 truncate">
                      {conv.lastMessage}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(conv.lastDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}