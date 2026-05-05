'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import Link from 'next/link';

type User = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: 'admin' | 'seller' | 'buyer';
  is_banned?: boolean;
  created_at: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers]  = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, searchTerm, roleFilter, statusFilter, dateFrom, dateTo]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    else setUsers(data || []);
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((u) =>
        statusFilter === 'banned' ? u.is_banned === true : u.is_banned !== true
      );
    }
    if (dateFrom) {
      filtered = filtered.filter((u) => new Date(u.created_at) >= new Date(dateFrom));
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59);
      filtered = filtered.filter((u) => new Date(u.created_at) <= endDate);
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  };

  const updateRole = async (userId: string, newRole: string) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    fetchUsers();
  };

  const toggleBan = async (userId: string, currentBanStatus: boolean) => {
    await supabase.from('profiles').update({ is_banned: !currentBanStatus }).eq('id', userId);
    fetchUsers();
  };

  const deleteUser = async (userId: string) => {
    if (confirm('⚠️ Supprimer définitivement cet utilisateur ? Cette action est irréversible.')) {
      await supabase.from('profiles').delete().eq('id', userId);
      fetchUsers();
    }
  };

  const saveInlineEdit = async (userId: string) => {
    const updates: any = {};
    if (editName !== undefined) updates.full_name = editName || null;
    if (editPhone !== undefined) updates.phone = editPhone || null;
    await supabase.from('profiles').update(updates).eq('id', userId);
    setEditingId(null);
    fetchUsers();
  };

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setEditName(user.full_name || '');
    setEditPhone(user.phone || '');
  };

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    sellers: users.filter((u) => u.role === 'seller').length,
    buyers: users.filter((u) => u.role === 'buyer').length,
    banned: users.filter((u) => u.is_banned === true).length,
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  if (loading) return <div className="p-8 text-center">Chargement des utilisateurs...</div>;

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">👥 Gestion des utilisateurs</h1>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white p-3 rounded-xl shadow text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="bg-white p-3 rounded-xl shadow text-center">
          <p className="text-2xl font-bold text-red-600">{stats.admins}</p>
          <p className="text-xs text-gray-500">Admins</p>
        </div>
        <div className="bg-white p-3 rounded-xl shadow text-center">
          <p className="text-2xl font-bold text-green-600">{stats.sellers}</p>
          <p className="text-xs text-gray-500">Producteurs</p>
        </div>
        <div className="bg-white p-3 rounded-xl shadow text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.buyers}</p>
          <p className="text-xs text-gray-500">Acheteurs</p>
        </div>
        <div className="bg-white p-3 rounded-xl shadow text-center">
          <p className="text-2xl font-bold text-orange-600">{stats.banned}</p>
          <p className="text-xs text-gray-500">Bannis</p>
        </div>
      </div>

      {/* Filtres et recherche (avec dates) */}
      <div className="bg-white p-4 rounded-xl shadow mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">🔍 Rechercher</label>
          <input
            type="text"
            placeholder="Email ou nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">📌 Rôle</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">Tous</option>
            <option value="admin">Admin</option>
            <option value="seller">Producteur</option>
            <option value="buyer">Acheteur</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">🚦 Statut</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">Tous</option>
            <option value="active">Actif</option>
            <option value="banned">Banni</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">📅 Du</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">📅 Au</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <button
            onClick={() => {
              setSearchTerm('');
              setRoleFilter('all');
              setStatusFilter('all');
              setDateFrom('');
              setDateTo('');
            }}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Tableau desktop */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-xl shadow">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left text-sm font-semibold">Utilisateur</th>
              <th className="p-3 text-left text-sm font-semibold">Rôle</th>
              <th className="p-3 text-left text-sm font-semibold">Téléphone</th>
              <th className="p-3 text-left text-sm font-semibold">Statut</th>
              <th className="p-3 text-left text-sm font-semibold">Inscrit le</th>
              <th className="p-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {currentUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="p-3">
                  {editingId === user.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="border rounded px-2 py-1 w-full"
                      placeholder="Nom"
                    />
                  ) : (
                    <div>
                      <div className="font-medium">{user.full_name || '—'}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  )}
                </td>
                <td className="p-3">
                  <select
                    value={user.role}
                    onChange={(e) => updateRole(user.id, e.target.value)}
                    className={`px-2 py-1 rounded text-sm border ${
                      user.role === 'admin'
                        ? 'bg-red-100 text-red-700'
                        : user.role === 'seller'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    <option value="buyer">Acheteur</option>
                    <option value="seller">Producteur</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="p-3">
                  {editingId === user.id ? (
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="border rounded px-2 py-1 w-full"
                      placeholder="Téléphone"
                    />
                  ) : (
                    user.phone || '—'
                  )}
                </td>
                <td className="p-3">
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                      user.is_banned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {user.is_banned ? 'Banni' : 'Actif'}
                  </span>
                </td>
                <td className="p-3 text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <div className="flex gap-2 flex-wrap">
                    {editingId === user.id ? (
                      <>
                        <button onClick={() => saveInlineEdit(user.id)} className="text-green-600 text-sm hover:underline">
                          💾 Sauvegarder
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-gray-500 text-sm hover:underline">
                          Annuler
                        </button>
                      </>
                    ) : (
                      <button onClick={() => startEdit(user)} className="text-blue-600 text-sm hover:underline">
                        ✏️ Modifier
                      </button>
                    )}
                    <button
                      onClick={() => toggleBan(user.id, !!user.is_banned)}
                      className={`text-sm ${user.is_banned ? 'text-green-600' : 'text-orange-600'} hover:underline`}
                    >
                      {user.is_banned ? '🔓 Débannir' : '🔒 Bannir'}
                    </button>
                    <button onClick={() => deleteUser(user.id)} className="text-red-600 text-sm hover:underline">
                      🗑️ Supprimer
                    </button>
                    <Link href={`/admin/messages?user=${user.id}`} className="text-blue-600 text-sm hover:underline">
                      💬 Messages
                    </Link>
                    <Link href={`/admin/orders?user=${user.id}`} className="text-green-600 text-sm hover:underline">
                      📦 Commandes
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Version mobile : cartes */}
      <div className="md:hidden space-y-4">
        {currentUsers.map((user) => (
          <div key={user.id} className="bg-white rounded-xl shadow p-4 border">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-800">{user.full_name || '—'}</h3>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  user.is_banned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}
              >
                {user.is_banned ? 'Banni' : 'Actif'}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Rôle :</span>{' '}
                <select
                  value={user.role}
                  onChange={(e) => updateRole(user.id, e.target.value)}
                  className="text-sm border rounded px-1"
                >
                  <option value="buyer">Acheteur</option>
                  <option value="seller">Producteur</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <span className="text-gray-500">Tél :</span> {user.phone || '—'}
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Inscrit :</span> {new Date(user.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => toggleBan(user.id, !!user.is_banned)}
                className={`text-xs px-2 py-1 rounded ${
                  user.is_banned ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                }`}
              >
                {user.is_banned ? '🔓 Débannir' : '🔒 Bannir'}
              </button>
              <Link href={`/admin/messages?user=${user.id}`} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                💬 Messages
              </Link>
              <Link href={`/admin/orders?user=${user.id}`} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                📦 Commandes
              </Link>
              <button onClick={() => deleteUser(user.id)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                🗑️ Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Précédent
          </button>
          <span className="px-3 py-1">
            Page {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}