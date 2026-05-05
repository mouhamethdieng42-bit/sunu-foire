'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function Navigation() {
  const { totalItems } = useCart();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openMobileSection, setOpenMobileSection] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    setDrawerOpen(false);
    setOpenMobileSection(null);
  }, [pathname]);

  const handleMouseEnter = (name: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpenMobileSection(name);
  };
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpenMobileSection(null), 180);
  };
  const toggleMobileSection = (name: string) => {
    setOpenMobileSection(openMobileSection === name ? null : name);
  };

  const isAdmin = role === 'admin';
  const isSeller = role === 'seller';
  const isBuyer = role === 'buyer';

  return (
    <>
      <nav className="bg-green-700 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="text-xl font-bold tracking-tight">
              🌾 SUNU FOIRE
            </Link>

            {/* Bouton burger (mobile) */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden text-2xl focus:outline-none"
            >
              ☰
            </button>

            {/* Menu desktop */}
            <div className="hidden md:flex gap-6 items-center">
              <DesktopMenu
                user={user}
                role={role}
                totalItems={totalItems}
                handleLogout={handleLogout}
                openDropdown={openMobileSection}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Drawer mobile */}
      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
        role={role}
        totalItems={totalItems}
        handleLogout={handleLogout}
        openSection={openMobileSection}
        toggleSection={toggleMobileSection}
      />
    </>
  );
}

// --- Desktop Menu (dropdowns au survol) ---
function DesktopMenu({
  user,
  role,
  totalItems,
  handleLogout,
  openDropdown,
  onMouseEnter,
  onMouseLeave,
}: any) {
  const isAdmin = role === 'admin';
  const isSeller = role === 'seller';
  const isBuyer = role === 'buyer';

  const linkClassName = "relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-white after:transition-all after:duration-300 hover:after:w-full";
  const dropdownTransition = "transition-all duration-200 ease-out origin-top-right";

  return (
    <>
      <Link href="/products" className={linkClassName}>Catalogue</Link>
      <Link href="/cart" className={`${linkClassName} relative`}>
        🛒 Panier
        {totalItems > 0 && (
          <span className="absolute -top-2 -right-4 bg-red-500 text-white text-xs rounded-full px-1.5">
            {totalItems}
          </span>
        )}
      </Link>

      {user ? (
        <>
          <div
            className="relative"
            onMouseEnter={() => onMouseEnter('account')}
            onMouseLeave={onMouseLeave}
          >
            <button className={`${linkClassName} flex items-center gap-1`}>
              👤 Mon compte
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              className={`absolute left-0 mt-2 w-56 bg-white text-gray-800 rounded-lg shadow-xl py-1 z-20 ${dropdownTransition} ${
                openDropdown === 'account'
                  ? 'opacity-100 scale-100 pointer-events-auto'
                  : 'opacity-0 scale-95 pointer-events-none'
              }`}
            >
              {isBuyer && (
                <Link href="/buyer/dashboard" className="block px-4 py-2 hover:bg-green-50 hover:text-green-700">🛒 Mon espace acheteur</Link>
              )}
              {isSeller && (
                <Link href="/dashboard/seller" className="block px-4 py-2 hover:bg-green-50 hover:text-green-700">📊 Dashboard vendeur</Link>
              )}
              <Link href="/account/orders" className="block px-4 py-2 hover:bg-green-50 hover:text-green-700">📦 Mes commandes</Link>
              <Link href="/messages" className="block px-4 py-2 hover:bg-green-50 hover:text-green-700">💬 Messages</Link>
            </div>
          </div>

          {isAdmin && (
            <div
              className="relative"
              onMouseEnter={() => onMouseEnter('admin')}
              onMouseLeave={onMouseLeave}
            >
              <button className={`${linkClassName} flex items-center gap-1`}>
                👑 Administration
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div
                className={`absolute left-0 mt-2 w-64 bg-white text-gray-800 rounded-lg shadow-xl py-1 z-20 ${dropdownTransition} ${
                  openDropdown === 'admin'
                    ? 'opacity-100 scale-100 pointer-events-auto'
                    : 'opacity-0 scale-95 pointer-events-none'
                }`}
              >
                <Link href="/admin" className="block px-4 py-2 hover:bg-green-50 hover:text-green-700">📊 Tableau de bord</Link>
                <Link href="/admin/settings" className="block px-4 py-2 hover:bg-green-50 hover:text-green-700">⚙️ Paramètres site</Link>
                <Link href="/admin/transactions" className="block px-4 py-2 hover:bg-green-50 hover:text-green-700">💰 Transactions</Link>
                <Link href="/admin/transaction-settings" className="block px-4 py-2 hover:bg-green-50 hover:text-green-700">💸 Paramètres transactions</Link>
              </div>
            </div>
          )}

          <button onClick={handleLogout} className={linkClassName}>🚪 Déconnexion</button>
        </>
      ) : (
        <>
          <Link href="/auth/login" className={linkClassName}>Connexion</Link>
          <Link href="/auth/register" className={linkClassName}>Inscription</Link>
        </>
      )}
    </>
  );
}

// --- Mobile Drawer (menu latéral avec accordéons) ---
function MobileDrawer({
  isOpen,
  onClose,
  user,
  role,
  totalItems,
  handleLogout,
  openSection,
  toggleSection,
}: any) {
  const isAdmin = role === 'admin';
  const isSeller = role === 'seller';
  const isBuyer = role === 'buyer';

  // Fermeture avec la touche Échap
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const linkMobile = "block py-2 px-4 rounded hover:bg-green-50 hover:text-green-700 transition";
  const sectionButtonClass = "w-full text-left py-2 px-4 flex justify-between items-center hover:bg-green-50 rounded transition text-gray-700";
  const dropdownTransition = "transition-all duration-200 ease-out overflow-hidden";

  return (
    <>
      {/* Overlay (léger avec flou) */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      {/* Drawer panel (droite) */}
      <div
        className={`fixed top-0 right-0 h-full w-80 sm:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <span className="text-lg font-semibold text-gray-800">🌾 SUNU FOIRE</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-1 py-2 overflow-y-auto max-h-full">
          <Link href="/products" className={linkMobile} onClick={onClose}>📦 Catalogue</Link>
          <Link href="/cart" className={linkMobile} onClick={onClose}>
            🛒 Panier
            {totalItems > 0 && <span className="ml-2 bg-red-500 text-white px-1.5 rounded-full text-xs">{totalItems}</span>}
          </Link>

          {user ? (
            <>
              {/* Mon compte (accordéon) */}
              <div>
                <button onClick={() => toggleSection('account')} className={sectionButtonClass}>
                  <span>👤 Mon compte</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${openSection === 'account' ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  className={`${dropdownTransition} ${openSection === 'account' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <div className="pl-4 flex flex-col gap-1 mt-1 pb-2">
                    {isBuyer && (
                      <Link href="/buyer/dashboard" className="block py-2 px-4 rounded hover:bg-green-50 hover:text-green-700 transition" onClick={onClose}>
                        🛒 Mon espace acheteur
                      </Link>
                    )}
                    {isSeller && (
                      <Link href="/dashboard/seller" className="block py-2 px-4 rounded hover:bg-green-50 hover:text-green-700 transition" onClick={onClose}>
                        📊 Dashboard vendeur
                      </Link>
                    )}
                    <Link href="/account/orders" className="block py-2 px-4 rounded hover:bg-green-50 hover:text-green-700 transition" onClick={onClose}>
                      📦 Mes commandes
                    </Link>
                    <Link href="/messages" className="block py-2 px-4 rounded hover:bg-green-50 hover:text-green-700 transition" onClick={onClose}>
                      💬 Messages
                    </Link>
                  </div>
                </div>
              </div>

              {/* Administration (accordéon, admin only) */}
              {isAdmin && (
                <div>
                  <button onClick={() => toggleSection('admin')} className={sectionButtonClass}>
                    <span>👑 Administration</span>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${openSection === 'admin' ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div
                    className={`${dropdownTransition} ${openSection === 'admin' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                  >
                    <div className="pl-4 flex flex-col gap-1 mt-1 pb-2">
                      <Link href="/admin" className="block py-2 px-4 rounded hover:bg-green-50 hover:text-green-700 transition" onClick={onClose}>
                        📊 Tableau de bord
                      </Link>
                      <Link href="/admin/settings" className="block py-2 px-4 rounded hover:bg-green-50 hover:text-green-700 transition" onClick={onClose}>
                        ⚙️ Paramètres site
                      </Link>
                      <Link href="/admin/transactions" className="block py-2 px-4 rounded hover:bg-green-50 hover:text-green-700 transition" onClick={onClose}>
                        💰 Transactions
                      </Link>
                      <Link href="/admin/transaction-settings" className="block py-2 px-4 rounded hover:bg-green-50 hover:text-green-700 transition" onClick={onClose}>
                        💸 Paramètres transactions
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <button onClick={handleLogout} className={linkMobile}>🚪 Déconnexion</button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className={linkMobile} onClick={onClose}>🔐 Connexion</Link>
              <Link href="/auth/register" className={linkMobile} onClick={onClose}>📝 Inscription</Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}