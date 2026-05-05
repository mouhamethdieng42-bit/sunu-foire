'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ConversationPage() {
  const { id } = useParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    getUser();
  }, []);

  useEffect(() => {
    if (userId && id) {
      fetchMessages();
      markMessagesAsRead();

      // ✅ Correction : on capture le channel pour bien le nettoyer
      const channel = supabase
        .channel('messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          if (payload.new.sender_id === id || payload.new.receiver_id === id) {
            fetchMessages();
          }
        })
        .subscribe();

      // ✅ Nettoyage synchrone (pas de Promise retournée directement)
      return () => {
        channel.unsubscribe();
      };
    }
  }, [userId, id]);

  // Faire défiler automatiquement vers le dernier message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getUser = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.push('/auth/login');
      return;
    }
    setUserId(data.user.id);
    getOtherUser(data.user.id);
  };

  const getOtherUser = async (currentUserId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', id)
      .single();
    setOtherUser(profile);
    setLoading(false);
  };

  const fetchMessages = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
  };

  const markMessagesAsRead = async () => {
    if (!userId) return;
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', userId)
      .eq('sender_id', id);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { error } = await supabase.from('messages').insert({
      sender_id: userId,
      receiver_id: id,
      message: newMessage.trim(),
    });

    if (!error) {
      setNewMessage('');
      fetchMessages();
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-50">
      {/* En-tête fixe */}
      <div className="bg-green-700 text-white p-3 md:p-4 shadow-md flex items-center gap-3 sticky top-0 z-10">
        <Link href="/messages" className="text-white hover:text-green-200 text-xl">
          ←
        </Link>
        <div>
          <h1 className="font-bold text-base md:text-lg">{otherUser?.full_name || 'Producteur'}</h1>
          <p className="text-green-100 text-xs">En ligne</p>
        </div>
      </div>

      {/* Zone des messages (scrollable) */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
        {messages.map((msg) => {
          const isMine = msg.sender_id === userId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] md:max-w-[70%] px-3 py-2 rounded-2xl ${
                  isMine
                    ? 'bg-green-600 text-white rounded-br-none'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                }`}
              >
                <p className="text-sm md:text-base break-words">{msg.message}</p>
                <p className={`text-xs mt-1 ${isMine ? 'text-green-100' : 'text-gray-400'} text-right`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Formulaire d'envoi (fixe en bas) */}
      <div className="bg-white border-t p-3 md:p-4 sticky bottom-0">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrivez votre message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 text-sm md:text-base"
          />
          <button
            type="submit"
            className="bg-green-600 text-white px-4 md:px-6 py-2 rounded-full hover:bg-green-700 transition text-sm md:text-base"
          >
            Envoyer
          </button>
        </form>
      </div>
    </div>
  );
}