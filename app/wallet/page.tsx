'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

type Transaction = {
  id: string;
  type: 'deposit' | 'payment' | 'commission' | 'withdrawal';
  amount: number;
  status: string;
  payment_method: string | null;
  reference: string;
  description: string | null;
  created_at: string;
};

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const router = useRouter();

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('wave');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, searchTerm, typeFilter]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login?redirect=/wallet');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();
    setBalance(profile?.wallet_balance || 0);

    const { data: tx } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setTransactions(tx || []);
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...transactions];
    if (searchTerm) {
      filtered = filtered.filter(tx =>
        tx.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (typeFilter !== 'all') filtered = filtered.filter(tx => tx.type === typeFilter);
    setFilteredTransactions(filtered);
    setCurrentPage(1);
  };

  const handleDeposit = async () => {
    setMessage(null);
    const amount = parseInt(depositAmount);
    if (isNaN(amount)) {
      setMessage({ type: 'error', text: 'Montant invalide' });
      return;
    }
    setProcessing(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setMessage({ type: 'error', text: 'Session expirée' });
      setProcessing(false);
      return;
    }

    const res = await fetch('/api/deposit-simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage({ type: 'success', text: `Dépôt de ${amount} FCFA effectué !` });
      setBalance(data.newBalance);
      setDepositAmount('');
      setShowDepositForm(false);
      fetchData();
    } else {
      setMessage({ type: 'error', text: data.error || 'Erreur lors du dépôt' });
    }
    setProcessing(false);
  };

  const handleWithdraw = async () => {
    setMessage(null);
    const amount = parseInt(withdrawAmount);
    if (isNaN(amount)) {
      setMessage({ type: 'error', text: 'Montant invalide' });
      return;
    }
    if (amount > balance) {
      setMessage({ type: 'error', text: 'Solde insuffisant' });
      return;
    }
    setProcessing(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const res = await fetch('/api/withdraw-simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount, paymentMethod: withdrawMethod }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage({ type: 'success', text: `Retrait de ${amount} FCFA demandé` });
      setBalance(data.newBalance);
      setWithdrawAmount('');
      setShowWithdrawForm(false);
      fetchData();
    } else {
      setMessage({ type: 'error', text: data.error || 'Erreur lors du retrait' });
    }
    setProcessing(false);
  };

  // Graphique des 7 derniers jours (cumul)
  const chartData = [...transactions]
    .reverse()
    .slice(-7)
    .reduce((acc, tx) => {
      const date = new Date(tx.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      const last = acc[acc.length - 1];
      let cumulative = last ? last.solde : balance - (tx.type === 'deposit' ? tx.amount : 0);
      if (tx.type === 'deposit') cumulative += tx.amount;
      else if (tx.type === 'withdrawal') cumulative -= tx.amount;
      else if (tx.type === 'payment') cumulative -= tx.amount;
      else if (tx.type === 'commission') cumulative -= tx.amount;
      acc.push({ date, solde: cumulative });
      return acc;
    }, [] as { date: string; solde: number }[]);

  const totalPages = Math.ceil(filteredTransactions.length / rowsPerPage);
  const currentRows = filteredTransactions.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  if (loading) return <div className="p-8 text-center">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-green-700 to-green-600 -mx-4 md:-mx-8 px-4 md:px-8 py-6 mb-6 -mt-4 md:-mt-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-white">💰 Mon portefeuille</h1>
          <p className="text-green-100 mt-1">Gérez vos dépôts et retraits</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-8">
        {message && (
          <div className={`mb-6 p-3 rounded-lg text-center text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Colonne gauche (solde et formulaires) */}
          <div className="w-full lg:w-1/3 space-y-6">
            <div className="bg-white rounded-2xl shadow p-6 text-center">
              <p className="text-gray-500 text-sm">Solde disponible</p>
              <p className="text-3xl md:text-4xl font-bold text-green-600 break-words">{balance.toLocaleString()} FCFA</p>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  onClick={() => setShowDepositForm(true)}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition text-sm"
                >
                  💸 Déposer
                </button>
                <button
                  onClick={() => setShowWithdrawForm(true)}
                  className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-xl hover:bg-orange-700 transition text-sm"
                >
                  📤 Retirer
                </button>
              </div>
            </div>

            {showDepositForm && (
              <div className="bg-white rounded-2xl shadow p-6">
                <h3 className="font-bold mb-3">Dépôt (simulation)</h3>
                <input
                  type="number"
                  placeholder="Montant (FCFA)"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full p-2 border rounded-lg mb-3"
                />
                <button
                  onClick={handleDeposit}
                  disabled={processing}
                  className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {processing ? 'Traitement...' : 'Valider le dépôt'}
                </button>
                <button onClick={() => setShowDepositForm(false)} className="w-full mt-2 text-gray-500 text-sm">
                  Annuler
                </button>
              </div>
            )}

            {showWithdrawForm && (
              <div className="bg-white rounded-2xl shadow p-6">
                <h3 className="font-bold mb-3">Retrait (simulation)</h3>
                <input
                  type="number"
                  placeholder="Montant (FCFA)"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full p-2 border rounded-lg mb-3"
                />
                <select
                  value={withdrawMethod}
                  onChange={(e) => setWithdrawMethod(e.target.value)}
                  className="w-full p-2 border rounded-lg mb-3"
                >
                  <option value="wave">Wave (Mobile Money)</option>
                  <option value="orange">Orange Money</option>
                  <option value="senepay">Carte bancaire (SenePay)</option>
                </select>
                <button
                  onClick={handleWithdraw}
                  disabled={processing}
                  className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {processing ? 'Traitement...' : 'Demander le retrait'}
                </button>
                <button onClick={() => setShowWithdrawForm(false)} className="w-full mt-2 text-gray-500 text-sm">
                  Annuler
                </button>
              </div>
            )}

            {chartData.length > 2 && (
              <div className="bg-white rounded-2xl shadow p-4">
                <h3 className="font-semibold mb-2 text-sm">📈 Évolution récente (7 jours)</h3>
                <div className="h-48 md:h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={0} />
                      <YAxis tickFormatter={(v) => `${v.toLocaleString()}`} width={45} />
                      <Tooltip formatter={(value: any) => `${Number(value).toLocaleString()} FCFA`} />
                      <Line type="monotone" dataKey="solde" stroke="#16a34a" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Colonne droite : historique */}
          <div className="w-full lg:w-2/3">
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold mb-4">📋 Historique des transactions</h2>

              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Rechercher par référence..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 p-2 border rounded-lg text-sm"
                />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm w-full sm:w-auto"
                >
                  <option value="all">Tous types</option>
                  <option value="deposit">Dépôts</option>
                  <option value="withdrawal">Retraits</option>
                  <option value="payment">Paiements</option>
                  <option value="commission">Commissions</option>
                </select>
              </div>

              {/* Version mobile : cartes */}
              <div className="block lg:hidden space-y-3">
                {currentRows.map((tx) => (
                  <div key={tx.id} className="border rounded-lg p-3">
                    <div className="flex justify-between">
                      <span className="capitalize font-semibold text-sm">{tx.type}</span>
                      <span className={`text-sm font-bold ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'deposit' ? '+' : '-'}{tx.amount.toLocaleString()} FCFA
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{new Date(tx.created_at).toLocaleString('fr-FR')}</p>
                    <p className="text-xs text-gray-400 font-mono mt-1">Réf: {tx.reference.slice(0, 12)}…</p>
                  </div>
                ))}
              </div>

              {/* Version desktop : tableau */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-left">Montant</th>
                      <th className="p-2 text-left">Statut</th>
                      <th className="p-2 text-left">Référence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRows.map((tx) => (
                      <tr key={tx.id} className="border-t">
                        <td className="p-2 text-xs">{new Date(tx.created_at).toLocaleDateString()}</td>
                        <td className="p-2 capitalize">{tx.type}</td>
                        <td className={`p-2 font-medium ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'deposit' ? '+' : '-'}{tx.amount.toLocaleString()} FCFA
                        </td>
                        <td className="p-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            tx.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-2 text-xs font-mono">{tx.reference.slice(0, 12)}…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredTransactions.length === 0 && (
                <div className="text-center py-8 text-gray-500">Aucune transaction à afficher.</div>
              )}

              {filteredTransactions.length > rowsPerPage && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-6">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="px-3 py-1 border rounded disabled:opacity-50 text-sm"
                  >
                    Précédent
                  </button>
                  <span className="text-sm">Page {currentPage} / {totalPages}</span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="px-3 py-1 border rounded disabled:opacity-50 text-sm"
                  >
                    Suivant
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}