'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

type Transaction = {
  id: string;
  user_id: string;
  type: 'deposit' | 'payment' | 'commission' | 'withdrawal';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  payment_method: string | null;
  reference: string;
  description: string | null;
  created_at: string;
  profiles: { email: string; full_name: string } | null;
};

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filtered, setFiltered] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Tri
  const [sortField, setSortField] = useState<keyof Transaction>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [transactions, searchTerm, typeFilter, statusFilter, dateFrom, dateTo, sortField, sortOrder]);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select(`*, profiles (email, full_name)`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setError(error.message);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  const applyFiltersAndSort = () => {
    let result = [...transactions];

    // Recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.reference?.toLowerCase().includes(term) ||
          tx.profiles?.email?.toLowerCase().includes(term) ||
          tx.profiles?.full_name?.toLowerCase().includes(term)
      );
    }

    // Type
    if (typeFilter !== 'all') result = result.filter((tx) => tx.type === typeFilter);
    // Statut
    if (statusFilter !== 'all') result = result.filter((tx) => tx.status === statusFilter);
    // Date from
    if (dateFrom) result = result.filter((tx) => new Date(tx.created_at) >= new Date(dateFrom));
    // Date to
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59);
      result = result.filter((tx) => new Date(tx.created_at) <= end);
    }

    // Tri
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'created_at') {
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
      } else if (sortField === 'amount') {
        aVal = Number(a.amount);
        bVal = Number(b.amount);
      } else if (sortField === 'profiles') {
        aVal = a.profiles?.email || '';
        bVal = b.profiles?.email || '';
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFiltered(result);
    setCurrentPage(1);
  };

  const handleSort = (field: keyof Transaction) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const exportCSV = () => {
    const headers = ['ID', 'Utilisateur', 'Type', 'Montant', 'Statut', 'Méthode', 'Référence', 'Date'];
    const rows = filtered.map((tx) => [
      tx.id,
      tx.profiles?.email || 'N/A',
      tx.type,
      tx.amount,
      tx.status,
      tx.payment_method || '',
      tx.reference,
      new Date(tx.created_at).toLocaleString('fr-FR'),
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Calcul des stats
  const stats = {
    total: filtered.reduce((sum, tx) => sum + tx.amount, 0),
    deposit: filtered.filter(tx => tx.type === 'deposit').reduce((sum, tx) => sum + tx.amount, 0),
    payment: filtered.filter(tx => tx.type === 'payment').reduce((sum, tx) => sum + tx.amount, 0),
    commission: filtered.filter(tx => tx.type === 'commission').reduce((sum, tx) => sum + tx.amount, 0),
    withdrawal: filtered.filter(tx => tx.type === 'withdrawal').reduce((sum, tx) => sum + tx.amount, 0),
    count: filtered.length,
  };

  // Pagination
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentRows = filtered.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filtered.length / rowsPerPage);

  const getStatusBadge = (status: string) => {
    const classes = {
      completed: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700',
    }[status] || 'bg-gray-100 text-gray-700';
    return <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${classes}`}>{status}</span>;
  };

  if (loading) return <div className="p-8 text-center">Chargement des transactions...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Erreur : {error}</div>;

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <h1 className="text-2xl md:text-3xl font-bold">📊 Transactions</h1>
        <button
          onClick={exportCSV}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1"
        >
          📎 Exporter CSV
        </button>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div className="bg-white p-3 rounded-xl shadow text-center">
          <p className="text-xs text-gray-500">Total (FCFA)</p>
          <p className="text-xl font-bold text-gray-800">{stats.total.toLocaleString()}</p>
        </div>
        <div className="bg-white p-3 rounded-xl shadow text-center">
          <p className="text-xs text-gray-500">Dépôts</p>
          <p className="text-xl font-bold text-blue-600">{stats.deposit.toLocaleString()}</p>
        </div>
        <div className="bg-white p-3 rounded-xl shadow text-center">
          <p className="text-xs text-gray-500">Paiements</p>
          <p className="text-xl font-bold text-green-600">{stats.payment.toLocaleString()}</p>
        </div>
        <div className="bg-white p-3 rounded-xl shadow text-center">
          <p className="text-xs text-gray-500">Commissions</p>
          <p className="text-xl font-bold text-purple-600">{stats.commission.toLocaleString()}</p>
        </div>
        <div className="bg-white p-3 rounded-xl shadow text-center">
          <p className="text-xs text-gray-500">Retraits</p>
          <p className="text-xl font-bold text-orange-600">{stats.withdrawal.toLocaleString()}</p>
        </div>
        <div className="bg-white p-3 rounded-xl shadow text-center">
          <p className="text-xs text-gray-500">Nb transactions</p>
          <p className="text-xl font-bold text-gray-800">{stats.count}</p>
        </div>
      </div>

      {/* Barre de filtres */}
      <div className="bg-white p-4 rounded-xl shadow mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-medium mb-1">🔍 Recherche</label>
          <input
            type="text"
            placeholder="Email, référence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">📌 Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
            <option value="all">Tous</option>
            <option value="deposit">Dépôt</option>
            <option value="payment">Paiement</option>
            <option value="commission">Commission</option>
            <option value="withdrawal">Retrait</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">🚦 Statut</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
            <option value="all">Tous</option>
            <option value="completed">Complété</option>
            <option value="pending">En attente</option>
            <option value="failed">Échoué</option>
            <option value="cancelled">Annulé</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">📅 Du</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">📅 Au</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 border rounded-lg" />
        </div>
        <button
          onClick={() => {
            setSearchTerm('');
            setTypeFilter('all');
            setStatusFilter('all');
            setDateFrom('');
            setDateTo('');
          }}
          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
        >
          Réinitialiser
        </button>
      </div>

      {/* Tableau desktop */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-xl shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('profiles')}>Utilisateur</th>
              <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('type')}>Type</th>
              <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('amount')}>Montant</th>
              <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>Statut</th>
              <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('payment_method')}>Méthode</th>
              <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('reference')}>Référence</th>
              <th className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('created_at')}>Date</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.map((tx) => (
              <tr key={tx.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{tx.profiles?.email || 'N/A'}</td>
                <td className="p-3 capitalize">{tx.type}</td>
                <td className="p-3 font-medium">{tx.amount.toLocaleString()} FCFA</td>
                <td className="p-3">{getStatusBadge(tx.status)}</td>
                <td className="p-3">{tx.payment_method || '—'}</td>
                <td className="p-3 text-xs font-mono">{tx.reference}</td>
                <td className="p-3 text-xs">{new Date(tx.created_at).toLocaleString('fr-FR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Version mobile (cartes) */}
      <div className="md:hidden space-y-4">
        {currentRows.map((tx) => (
          <div key={tx.id} className="bg-white rounded-lg shadow p-4 border">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{tx.profiles?.email || 'N/A'}</p>
                <p className="text-xs text-gray-500 font-mono">{tx.reference}</p>
              </div>
              {getStatusBadge(tx.status)}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Type :</span> <span className="capitalize">{tx.type}</span></div>
              <div><span className="text-gray-500">Montant :</span> <span className="font-bold">{tx.amount.toLocaleString()} FCFA</span></div>
              <div><span className="text-gray-500">Méthode :</span> {tx.payment_method || '—'}</div>
              <div><span className="text-gray-500">Date :</span> {new Date(tx.created_at).toLocaleString('fr-FR')}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span>Lignes par page :</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="border rounded px-2 py-1"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            <span className="ml-2">{filtered.length} total</span>
          </div>
          <div className="flex gap-2">
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
        </div>
      )}
    </div>
  );
}