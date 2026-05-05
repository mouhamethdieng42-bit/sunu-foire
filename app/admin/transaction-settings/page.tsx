'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export default function TransactionSettingsPage() {
  const [settings, setSettings] = useState({
    default_commission_rate: '5',
    min_deposit_amount: '500',
    min_withdrawal_amount: '1000',
    senepay_fee_rate: '3.57',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('commission_settings').select('key, value');
    if (data) {
      const settingsMap: any = {};
      data.forEach((item) => {
        settingsMap[item.key] = item.value;
      });
      setSettings((prev) => ({ ...prev, ...settingsMap }));
    }
    setLoading(false);
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    for (const [key, value] of Object.entries(settings)) {
      await supabase
        .from('commission_settings')
        .update({ value, updated_at: new Date() })
        .eq('key', key);
    }
    alert('Paramètres sauvegardés');
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold mb-6">⚙️ Paramètres transaction</h1>

      <div className="bg-white rounded-xl shadow p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1">Commission par défaut (%)</label>
            <input
              type="number"
              step="0.1"
              value={settings.default_commission_rate}
              onChange={(e) => handleChange('default_commission_rate', e.target.value)}
              className="w-full p-2 border rounded"
            />
            <p className="text-xs text-gray-500">Prélevé sur chaque vente (vendeur)</p>
          </div>

          <div>
            <label className="block font-semibold mb-1">Montant minimum dépôt (FCFA)</label>
            <input
              type="number"
              value={settings.min_deposit_amount}
              onChange={(e) => handleChange('min_deposit_amount', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Montant minimum retrait (FCFA)</label>
            <input
              type="number"
              value={settings.min_withdrawal_amount}
              onChange={(e) => handleChange('min_withdrawal_amount', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Frais estimés SenePay (%)</label>
            <input
              type="number"
              step="0.01"
              value={settings.senepay_fee_rate}
              onChange={(e) => handleChange('senepay_fee_rate', e.target.value)}
              className="w-full p-2 border rounded"
            />
            <p className="text-xs text-gray-500">Affichage uniquement</p>
          </div>
        </div>

        <button
          onClick={saveSettings}
          disabled={saving}
          className="w-full md:w-auto bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : '💾 Enregistrer'}
        </button>
      </div>
    </div>
  );
}