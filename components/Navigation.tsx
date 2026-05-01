'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function Navigation() {
  const { totalItems } = useCart();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const getUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
      setRole(profile?.role || null);
    } else {
      setRole(null);
    }
  };

  useEffect(() => {
    getUser();
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <nav className="bg-green-700 text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Logo */}
          <Link href="/" className="text-xl font-bold whitespace-nowrap">
            🌾 SUNU FOIRE
          </Link>

          {/* Bouton burger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-2xl focus:outline-none"
          >
            {menuOpen ? '✕' : '☰'}
          </button>

          {/* Menu desktop */}
          <div className="hidden md:flex gap-6 items-center">
            <DesktopMenu 
              user={user} 
              role={role} 
              totalItems={totalItems} 
              handleLogout={handleLogout} 
            />
          </div>
        </div>

        {/* Menu mobile */}
        {menuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-green-600 flex flex-col gap-3">
            <MobileMenu 
              user={user} 
              role={role} 
              totalItems={totalItems} 
              handleLogout={handleLogout} 
            />
          </div>
        )}
      </div>
    </nav>
  );
}

function DesktopMenu({ user, role, totalItems, handleLogout }: any) {
  return (
    <>
      <Link href="/products" className="hover:underline">Catalogue</Link>
      <Link href="/cart" className="hover:underline relative">
        🛒 Panier
        {totalItems > 0 && (
          <span className="absolute -top-2 -right-4 bg-red-500 text-white text-xs rounded-full px-1.5">
            {totalItems}
          </span>
        )}
      </Link>
      {user ? (
        <>
          {role === 'seller' && (
            <Link href="/dashboard/seller" className="hover:underline">📊 Dashboard</Link>
          )}
          {role === 'buyer' && (
            <Link href="/buyer/dashboard" className="hover:underline">👤 Mon espace</Link>
          )}
          {role === 'admin' && (
            <Link href="/admin" className="hover:underline">👑 Admin</Link>
          )}
          {role === 'admin' && (
            <Link href="/admin/settings" className="hover:underline">⚙️ Paramètres</Link>
          )}
          <Link href="/account/orders" className="hover:underline">📦 Commandes</Link>
          <Link href="/messages" className="hover:underline">💬 Messages</Link>
          <button onClick={handleLogout} className="hover:underline">🚪 Déconnexion</button>
        </>
      ) : (
        <>
          <Link href="/auth/login" className="hover:underline">Connexion</Link>
          <Link href="/auth/register" className="hover:underline">Inscription</Link>
        </>
      )}
    </>
  );
}

function MobileMenu({ user, role, totalItems, handleLogout }: any) {
  return (
    <div className="flex flex-col gap-3">
      <Link href="/products" className="hover:underline py-1">📦 Catalogue</Link>
      <Link href="/cart" className="hover:underline py-1 relative">
        🛒 Panier
        {totalItems > 0 && <span className="ml-2 bg-red-500 px-1.5 rounded-full text-xs">{totalItems}</span>}
      </Link>
      {user ? (
        <>
          {role === 'seller' && (
            <Link href="/dashboard/seller" className="hover:underline py-1">📊 Dashboard</Link>
          )}
          {role === 'buyer' && (
            <Link href="/buyer/dashboard" className="hover:underline py-1">👤 Mon espace</Link>
          )}
          {role === 'admin' && (
            <Link href="/admin" className="hover:underline py-1">👑 Admin</Link>
          )}
          {role === 'admin' && (
            <Link href="/admin/settings" className="hover:underline py-1">⚙️ Paramètres</Link>
          )}
          <Link href="/account/orders" className="hover:underline py-1">📦 Mes commandes</Link>
          <Link href="/messages" className="hover:underline py-1">💬 Messages</Link>
          <button onClick={handleLogout} className="text-left hover:underline py-1">🚪 Déconnexion</button>
        </>
      ) : (
        <>
          <Link href="/auth/login" className="hover:underline py-1">🔐 Connexion</Link>
          <Link href="/auth/register" className="hover:underline py-1">📝 Inscription</Link>
        </>
      )}
    </div>
  );
}