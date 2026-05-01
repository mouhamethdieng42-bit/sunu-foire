'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // État pour le formulaire d'ajout
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('buyer');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredUsers(users.filter(user => 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  const updateRole = async (userId: string, newRole: string) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    fetchUsers();
  };

  const deleteUser = async (userId: string) => {
    if (confirm('⚠️ Supprimer cet utilisateur ? Toutes ses données seront perdues.')) {
      await supabase.from('profiles').delete().eq('id', userId);
      fetchUsers();
    }
  };

  // Ajouter un utilisateur en utilisant signUp
  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAdding(true);

    try {
      // Vérifier si l'email existe déjà dans profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', newEmail)
        .single();

      if (existingProfile) {
        throw new Error('Un utilisateur avec cet email existe déjà.');
      }

      // Générer un mot de passe temporaire
      const tempPassword = Math.random().toString(36).slice(-10) + "A1!";

      // Créer l'utilisateur via signUp
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: newEmail,
        password: tempPassword,
      });

      if (signUpError) throw new Error(signUpError.message);

      if (authData.user) {
        // Créer le profil manuellement
        const { error: insertError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          email: newEmail,
          full_name: newFullName || null,
          phone: newPhone || null,
          role: newRole,
        });

        if (insertError) throw new Error(insertError.message);
      }

      alert(`✅ Utilisateur créé !\n\nEmail: ${newEmail}\nMot de passe temporaire: ${tempPassword}\n\n⚠️ L'utilisateur devra changer son mot de passe à la première connexion.`);
      
      setNewEmail('');
      setNewFullName('');
      setNewPhone('');
      setNewRole('buyer');
      setShowAddForm(false);
      fetchUsers();

    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: 'bg-red-100 text-red-700',
      seller: 'bg-green-100 text-green-700',
      buyer: 'bg-blue-100 text-blue-700',
    };
    const labels = {
      admin: '👑 Admin',
      seller: '🌾 Producteur',
      buyer: '🛒 Acheteur',
    };
    return { style: styles[role as keyof typeof styles] || 'bg-gray-100', label: labels[role as keyof typeof labels] || role };
  };

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    sellers: users.filter(u => u.role === 'seller').length,
    buyers: users.filter(u => u.role === 'buyer').length,
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">👥 Gestion des utilisateurs</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          + Ajouter un utilisateur
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <div className="bg-white border rounded-xl p-6 mb-6 shadow">
          <h2 className="text-lg font-bold mb-4">➕ Nouvel utilisateur</h2>
          {addError && <div className="bg-red-100 text-red-700 p-2 rounded mb-3">{addError}</div>}
          <form onSubmit={addUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="email"
              placeholder="Email *"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="p-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Nom complet"
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              className="p-2 border rounded"
            />
            <input
              type="tel"
              placeholder="Téléphone"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="p-2 border rounded"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="buyer">🛒 Acheteur</option>
              <option value="seller">🌾 Producteur</option>
              <option value="admin">👑 Admin</option>
            </select>
            <div className="flex gap-2 items-end">
              <button
                type="submit"
                disabled={adding}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {adding ? 'Création...' : 'Créer l\'utilisateur'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Annuler
              </button>
            </div>
          </form>
          <p className="text-xs text-gray-500 mt-3">
            💡 Un mot de passe temporaire sera généré et affiché après la création.
          </p>
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow text-center">
          <p className="text-2xl font-bold text-red-600">{stats.admins}</p>
          <p className="text-sm text-gray-500">Admins</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow text-center">
          <p className="text-2xl font-bold text-green-600">{stats.sellers}</p>
          <p className="text-sm text-gray-500">Producteurs</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.buyers}</p>
          <p className="text-sm text-gray-500">Acheteurs</p>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="🔍 Rechercher par email ou nom..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left text-sm font-semibold">Utilisateur</th>
              <th className="p-3 text-left text-sm font-semibold">Rôle</th>
              <th className="p-3 text-left text-sm font-semibold">Inscrit le</th>
              <th className="p-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredUsers.map((user) => {
              const { style, label } = getRoleBadge(user.role);
              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <div className="font-medium">{user.full_name || '—'}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="p-3">
                    <select
                      value={user.role || 'buyer'}
                      onChange={(e) => updateRole(user.id, e.target.value)}
                      className={`px-2 py-1 rounded text-sm border ${style}`}
                    >
                      <option value="buyer">🛒 Acheteur</option>
                      <option value="seller">🌾 Producteur</option>
                      <option value="admin">👑 Admin</option>
                    </select>
                  </td>
                  <td className="p-3 text-sm text-gray-500">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2 flex-wrap">
                      <Link
                        href={`/admin/messages?user=${user.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        💬 Messages
                      </Link>
                      <Link
                        href={`/admin/orders?user=${user.id}`}
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        📦 Commandes
                      </Link>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        🗑️ Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-8 text-gray-500">Aucun utilisateur trouvé</div>
      )}
    </div>
  );
}