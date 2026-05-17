'use client';

import { useEffect, useState } from 'react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  // On force l'affichage du bouton (toujours visible)
  const [show] = useState(true);

  useEffect(() => {
    const handler = (e: Event) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    console.log('Listener added for beforeinstallprompt');
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Fallback : explication manuelle
      alert("Pour installer l'application, utilisez le menu du navigateur : 'Ajouter à l'écran d'accueil' (ou 'Installer l'application').");
    }
  };

  return (
    <>
      {/* Bandeau de test temporaire (à supprimer après vérification) */}
      <div style={{ position: 'fixed', top: 0, left: 0, background: 'red', color: 'white', zIndex: 9999, padding: '4px 8px' }}>
        TEST : composant InstallButton rendu
      </div>
      <button
        onClick={handleInstall}
        className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg z-50"
      >
        📲 Installer l'application
      </button>
    </>
  );
}