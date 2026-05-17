'use client';

import { useEffect, useState } from 'react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      alert("Pour installer l'application, utilisez le menu du navigateur : 'Ajouter à l'écran d'accueil'.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShow(false);
    }
  };

  if (!show) return null;
  return (
    <button
      onClick={handleInstall}
      className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg z-50 hover:bg-green-700 transition"
    >
      📲 Installer l'application
    </button>
  );
}