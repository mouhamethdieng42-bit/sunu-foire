'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://sunu-foire.vercel.app/auth/update-password',
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Email envoyé ! Vérifiez votre boîte de réception.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold text-center text-green-700 mb-6">
          Mot de passe oublié
        </h1>

        <form onSubmit={handleReset}>
          <input
            type="email"
            placeholder="Votre email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 mb-3 border rounded"
            required
          />
          {message && <p className="text-green-600 text-sm mb-3">{message}</p>}
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button type="submit" className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700">
            Envoyer le lien
          </button>
        </form>

        <p className="text-center mt-4 text-sm">
          <a href="/auth/login" className="text-green-600">Retour à la connexion</a>
        </p>
      </div>
    </div>
  );
}