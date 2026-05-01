'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Formulaire
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      router.push('/auth/login');
      return;
    }

    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.user.id)
      .order('is_default', { ascending: false });
    
    setAddresses(data || []);
    setLoading(false);
  };

  const addAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    // Si cette adresse est par défaut, retirer le statut par défaut des autres
    if (isDefault) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.user.id);
    }

    const { error } = await supabase.from('addresses').insert({
      user_id: user.user.id,
      name,
      address,
      city,
      is_default: isDefault,
    });

    if (error) {
      alert('Erreur: ' + error.message);
    } else {
      setName('');
      setAddress('');
      setCity('');
      setIsDefault(false);
      setShowForm(false);
      fetchAddresses();
      alert('✅ Adresse ajoutée !');
    }
    setSaving(false);
  };

  const setDefaultAddress = async (id: string) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', user.user.id);
    
    await supabase
      .from('addresses')
      .update({ is_default: true })
      .eq('id', id);

    fetchAddresses();
  };

  const deleteAddress = async (id: string) => {
    if (confirm('Supprimer cette adresse ?')) {
      await supabase.from('addresses').delete().eq('id', id);
      fetchAddresses();
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">📍 Mes adresses</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          + Nouvelle adresse
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {showForm && (
        <div className="bg-white border rounded-xl p-6 mb-6 shadow">
          <h2 className="text-lg font-bold mb-4">➕ Ajouter une adresse</h2>
          <form onSubmit={addAddress} className="space-y-4">
            <input
              type="text"
              placeholder="Nom de l'adresse (ex: Maison, Bureau)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
            <textarea
              placeholder="Adresse complète"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2 border rounded"
              rows={2}
              required
            />
            <input
              type="text"
              placeholder="Ville"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              <span className="text-sm">Définir comme adresse par défaut</span>
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Ajout...' : 'Ajouter'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des adresses */}
      {addresses.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-xl text-center text-gray-500">
          Aucune adresse enregistrée
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{addr.name}</h3>
                    {addr.is_default && (
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                        Par défaut
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mt-1">{addr.address}</p>
                  <p className="text-gray-500 text-sm">{addr.city}</p>
                </div>
                <div className="flex gap-2">
                  {!addr.is_default && (
                    <button
                      onClick={() => setDefaultAddress(addr.id)}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      Définir par défaut
                    </button>
                  )}
                  <button
                    onClick={() => deleteAddress(addr.id)}
                    className="text-red-600 text-sm hover:underline"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Link href="/buyer/dashboard" className="text-blue-600 hover:underline">
          ← Retour à mon espace
        </Link>
      </div>
    </div>
  );
}