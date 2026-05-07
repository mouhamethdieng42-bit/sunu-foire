'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function CheckEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [countdown, setCountdown] = useState(0);

  const handleResend = async () => {
    if (!email) return;
    setResendStatus('sending');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    if (error) {
      setResendStatus('error');
    } else {
      setResendStatus('sent');
      setCountdown(60);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // Si email n'est pas dans l'URL, on essaie de le récupérer depuis la session (optionnel)
  useEffect(() => {
    if (!email) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user?.email) {
          window.history.replaceState(null, '', `/auth/check-email?email=${encodeURIComponent(data.user.email)}`);
        }
      });
    }
  }, [email]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 text-center">
        {/* Icône */}
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Vérifiez votre boîte mail</h1>
        <p className="text-gray-600 mb-6">
          Nous avons envoyé un lien de confirmation à <strong>{email || 'votre adresse email'}</strong>.
          Cliquez sur le lien pour activer votre compte.
        </p>

        <div className="bg-blue-50 rounded-lg p-4 text-left text-sm text-blue-800 mb-6">
          <p className="font-semibold mb-1">💡 Vous ne recevez pas l’email ?</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Vérifiez dans vos spams ou courriers indésirables</li>
            <li>Ajoutez <strong>noreply@supabase.co</strong> à vos contacts</li>
            <li>Attendez quelques minutes, le délai peut varier</li>
          </ul>
        </div>

        {/* Bouton renvoyer */}
        <button
          onClick={handleResend}
          disabled={resendStatus === 'sending' || countdown > 0}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resendStatus === 'sending' && 'Envoi en cours...'}
          {resendStatus === 'sent' && `Email renvoyé ! (${countdown}s)`}
          {resendStatus === 'error' && 'Erreur, réessayez plus tard'}
          {resendStatus === 'idle' && (countdown > 0 ? `Renvoyer (${countdown}s)` : 'Renvoyer l’email de confirmation')}
        </button>

        <div className="mt-6 text-sm text-gray-500">
          <Link href="/auth/login" className="text-green-600 hover:underline">
            ← Retour à la connexion
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Vous avez déjà confirmé votre email ?{' '}
          <Link href="/auth/login" className="text-green-600 hover:underline">
            Connectez-vous
          </Link>
        </p>
      </div>
    </div>
  );
}