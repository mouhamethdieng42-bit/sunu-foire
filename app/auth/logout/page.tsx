'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      await supabase.auth.signOut();
      router.push('/');
    };
    logout();
  }, []);

  return (
    <div className="p-8 text-center">
      <p>Déconnexion en cours...</p>
    </div>
  );
}