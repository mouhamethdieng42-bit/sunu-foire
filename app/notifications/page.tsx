'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (filter === 'all') {
      setFilteredNotifications(notifications);
    } else {
      setFilteredNotifications(notifications.filter(n => !n.is_read));
    }
  }, [filter, notifications]);

  const fetchNotifications = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      router.push('/auth/login');
      return;
    }

    const { data } = await supabase
      .from('notifications')
      .select('*, order:orders(id, total_amount)')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });

    setNotifications(data || []);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.user.id);
      fetchNotifications();
    }
  };

  const deleteNotification = async (id: string) => {
    if (confirm('Supprimer cette notification ?')) {
      await supabase.from('notifications').delete().eq('id', id);
      fetchNotifications();
    }
  };

  const getIcon = (title: string) => {
    if (title.includes('préparation')) return '🔵';
    if (title.includes('expédiée')) return '📦';
    if (title.includes('livrée')) return '🎉';
    if (title.includes('annulée')) return '❌';
    return '🔔';
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'à l\'instant';
    if (diffMins < 60) return `il y a ${diffMins} min`;
    if (diffHours < 24) return `il y a ${diffHours} h`;
    if (diffDays === 1) return 'hier';
    return `il y a ${diffDays} jours`;
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadCount} nouvelle(s)
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-blue-600 text-sm hover:underline"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* Filtres */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setFilter('all')}
              className={`pb-2 text-sm font-medium transition ${
                filter === 'all'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`pb-2 text-sm font-medium transition ${
                filter === 'unread'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Non lues {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>
        </div>
      </div>

      {/* Liste des notifications */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔔</div>
            <h3 className="text-lg font-semibold text-gray-700">Aucune notification</h3>
            <p className="text-gray-400 mt-1">Vous serez informé ici des mises à jour de vos commandes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notif, index) => (
              <div
                key={notif.id}
                className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in-up ${
                  !notif.is_read ? 'border-l-4 border-l-green-500' : ''
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="p-4 flex gap-3">
                  {/* Icône */}
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl">
                    {getIcon(notif.title)}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className={`font-semibold ${!notif.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                          {notif.title}
                        </h3>
                        <p className="text-gray-500 text-sm mt-0.5">{notif.message}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400">{getTimeAgo(notif.created_at)}</span>
                          {notif.order && (
                            <Link
                              href="/account/orders"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Voir la commande →
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!notif.is_read && (
                          <button
                            onClick={() => markAsRead(notif.id)}
                            className="text-gray-400 hover:text-green-600 text-sm px-2 py-1 rounded"
                            title="Marquer comme lu"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notif.id)}
                          className="text-gray-400 hover:text-red-600 text-sm px-2 py-1 rounded"
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}