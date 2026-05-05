'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WalletPage() {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      router.push('/auth/login?redirect=/wallet');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.user.id)
      .single();

    setBalance(profile?.wallet_balance || 0);
    setLoading(false);
  };

  const handleDeposit = async () => {
    setError('');
    setSuccess('');
    const amount = parseInt(depositAmount);
    if (isNaN(amount) || amount < 500) {
      setError('Le montant minimum de dépôt est de 500 FCFA');
      return;
    }

    // Appel API pour créer une transaction de dépôt (à implémenter)
    // Pour l'instant, on simule un succès
    setSuccess(`Demande de dépôt de ${amount} FCFA créée. Paiement à suivre.`);
    setDepositAmount('');
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">💰 Mon portefeuille</h1>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <p className="text-gray-500 text-sm">Solde actuel</p>
        <p className="text-3xl font-bold text-green-600">{balance.toLocaleString()} FCFA</p>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Alimenter le portefeuille</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FCFA)</label>
            <input
              type="number"
              placeholder="500 minimum"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          {error && <div className="bg-red-50 text-red-600 p-2 rounded text-sm">{error}</div>}
          {success && <div className="bg-green-50 text-green-600 p-2 rounded text-sm">{success}</div>}

          <button
            onClick={handleDeposit}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
          >
            Demander un dépôt
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Paiement sécurisé via Wave, Orange Money ou carte bancaire. Vous serez redirigé après confirmation.
        </p>
      </div>
    </div>
  );
}