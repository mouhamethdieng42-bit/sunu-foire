'use client';

import { useEffect, useState } from 'react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
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
      alert("Pour installer l'application, utilisez le menu du navigateur : 'Ajouter à l'écran d'accueil' (ou 'Installer l'application').");
    }
  };

  // Bouton toujours visible
  return (
    <button
      onClick={handleInstall}
      className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg z-50 hover:bg-green-700 transition"
    >
      📲 Installer l'application
    </button>
  );
}