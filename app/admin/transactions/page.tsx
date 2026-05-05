'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const router = useRouter();

  useEffect(() => {
    fetchTransactions();
  }, [filterType, filterStatus]);

  const fetchTransactions = async () => {
    setLoading(true);
    let query = supabase
      .from('transactions')
      .select(`
        *,
        profiles (email, full_name)
      `)
      .order('created_at', { ascending: false });

    if (filterType !== 'all') {
      query = query.eq('type', filterType);
    }
    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;
    if (error) console.error(error);
    else setTransactions(data || []);
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">📊 Gestion des transactions</h1>

      {/* Filtres */}
      <div className="flex gap-4 mb-6">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="all">Tous les types</option>
          <option value="deposit">Dépôt</option>
          <option value="payment">Paiement</option>
          <option value="commission">Commission</option>
          <option value="withdrawal">Retrait</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="all">Tous statuts</option>
          <option value="pending">En attente</option>
          <option value="completed">Complété</option>
          <option value="failed">Échoué</option>
          <option value="cancelled">Annulé</option>
        </select>
        <button onClick={fetchTransactions} className="bg-blue-600 text-white px-4 py-2 rounded">
          Rafraîchir
        </button>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Utilisateur</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Montant</th>
              <th className="p-3 text-left">Statut</th>
              <th className="p-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-t">
                <td className="p-3 text-sm">{tx.id.slice(0, 8)}</td>
                <td className="p-3">{tx.profiles?.email || 'N/A'}</td>
                <td className="p-3 capitalize">{tx.type}</td>
                <td className="p-3">{tx.amount.toLocaleString()} FCFA</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    tx.status === 'completed' ? 'bg-green-100 text-green-700' :
                    tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {tx.status}
                  </span>
                </td>
                <td className="p-3">{new Date(tx.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}