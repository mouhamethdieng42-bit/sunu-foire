'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AdminMessagesPage() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('user');
  const [messages, setMessages] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUser();
      fetchMessages();
    } else {
      fetchAllMessages();
    }
  }, [userId]);

  const fetchUser = async () => {
    const { data } = await supabase.from('profiles').select('full_name, email').eq('id', userId).single();
    setUser(data);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(full_name), receiver:profiles!messages_receiver_id_fkey(full_name)')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    setMessages(data || []);
    setLoading(false);
  };

  const fetchAllMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(full_name), receiver:profiles!messages_receiver_id_fkey(full_name)')
      .order('created_at', { ascending: false });
    setMessages(data || []);
    setLoading(false);
  };

  const deleteMessage = async (id: string) => {
    if (confirm('Supprimer ce message ?')) {
      await supabase.from('messages').delete().eq('id', id);
      if (userId) fetchMessages(); else fetchAllMessages();
    }
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">💬 Messages</h1>
        {userId && (
          <Link href="/admin/users" className="text-blue-600 hover:underline">
            ← Retour aux utilisateurs
          </Link>
        )}
      </div>

      {userId && user && (
        <div className="bg-gray-50 p-3 rounded-lg mb-4">
          <p className="font-semibold">{user.full_name || 'Utilisateur'}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Aucun message trouvé</div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">
                    {msg.sender?.full_name || 'Inconnu'} → {msg.receiver?.full_name || 'Inconnu'}
                  </p>
                  <p className="text-gray-600 mt-1">{msg.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(msg.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => deleteMessage(msg.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}