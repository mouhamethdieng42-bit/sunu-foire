'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';

// Composant pour une catégorie
function CategoryDropzone({ category, currentUrl, onUpload, onUrlChange, uploading }: any) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => onUpload(files[0]),
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  const getIcon = () => {
    if (category === 'agricole') return '🌾';
    if (category === 'elevage') return '🐄';
    if (category === 'artisanat') return '🎨';
    if (category === 'peche') return '🐟';
    return '📷';
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">{getIcon()}</div>
        <h3 className="font-bold text-lg capitalize">{category}</h3>
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        {currentUrl && <img src={currentUrl} alt={category} className="w-32 h-24 object-cover rounded-lg shadow" />}
        <div className="flex-1 space-y-3">
          <input type="text" value={currentUrl} onChange={(e) => onUrlChange(e.target.value)} placeholder="URL de l'image" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
          <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition ${isDragActive ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400'}`}>
            <input {...getInputProps()} />
            <p className="text-gray-500 text-sm">📁 Glissez une image ou cliquez</p>
          </div>
          {uploading && <p className="text-green-600 text-sm">📤 Upload en cours...</p>}
        </div>
      </div>
    </div>
  );
}

// Composant pour un élément du carrousel
function CarouselItem({ index, url, onUpdate, onRemove, onUpload, uploading, uploadProgress }: any) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => onUpload(files[0]),
    accept: { 'image/*': [] },
    maxFiles: 1,
  });
  const imageUrl = typeof url === 'string' ? url : '';

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition">
      {imageUrl && <img src={imageUrl} alt={`Slide ${index}`} className="w-full h-40 object-cover rounded-lg mb-3 shadow" />}
      <input type="text" value={imageUrl} onChange={(e) => onUpdate(e.target.value)} className="w-full p-2 border rounded-lg text-sm mb-3" />
      <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition mb-3 ${isDragActive ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400'}`}>
        <input {...getInputProps()} />
        <p className="text-gray-500 text-sm">📁 Glissez une image ou cliquez</p>
      </div>
      {uploading && <div className="h-1 bg-gray-200 rounded-full overflow-hidden mb-2"><div className="h-full bg-green-600 transition-all" style={{ width: `${uploadProgress}%` }} /></div>}
      <button onClick={() => onRemove()} className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm w-full hover:bg-red-700 transition">🗑️ Supprimer</button>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invoice');
  const [uploadingCat, setUploadingCat] = useState<string | null>(null);
  const [uploadingCarousel, setUploadingCarousel] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('key, value');
    const settingsMap: any = {};
    data?.forEach((s: any) => {
      try {
        settingsMap[s.key] = JSON.parse(s.value);
      } catch {
        settingsMap[s.key] = s.value;
      }
    });
    setSettings(settingsMap);
    setLoading(false);
  };

  const updateSetting = async (key: string, value: any) => {
    const valueToStore = typeof value === 'object' ? JSON.stringify(value) : String(value);
    await supabase.from('settings').update({ value: valueToStore, updated_at: new Date() }).eq('key', key);
    setSettings((prev: any) => ({ ...prev, [key]: value }));
    toast.success('Paramètre mis à jour');
  };

  const uploadCategoryImage = async (file: File, category: string) => {
    setUploadingCat(category);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );
    const data = await response.json();
    const imageUrl = data.secure_url;

    const current = settings.home_categories_images || {};
    updateSetting('home_categories_images', { ...current, [category]: imageUrl });
    setUploadingCat(null);
  };

  const uploadCarouselImage = async (file: File, index: number) => {
    setUploadingCarousel(index);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      const data = JSON.parse(xhr.response);
      const imageUrl = data.secure_url;
      const current = settings.home_carousel_images || {};
      updateSetting('home_carousel_images', { ...current, [index]: imageUrl });
      setUploadingCarousel(null);
      setUploadProgress(0);
    };
    xhr.send(formData);
  };

  const handleImageChange = (key: string, category: string, url: string) => {
    const current = settings[key] || {};
    updateSetting(key, { ...current, [category]: url });
  };

  const handleCarouselChange = (index: number, url: string) => {
    const current = settings.home_carousel_images || {};
    updateSetting('home_carousel_images', { ...current, [index]: url });
  };

  const addCarouselImage = async () => {
    const current = settings.home_carousel_images || {};
    const newIndex = Object.keys(current).length + 1;
    updateSetting('home_carousel_images', { ...current, [newIndex]: '' });
    toast.success('Nouvel emplacement ajouté');
  };

  const removeCarouselImage = async (index: number) => {
    const current = { ...(settings.home_carousel_images || {}) };
    delete current[index];
    updateSetting('home_carousel_images', current);
    toast.success('Image supprimée');
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      <div className="bg-gradient-to-r from-green-700 to-green-600 text-white -mx-4 md:-mx-8 px-4 md:px-8 py-6 mb-6 -mt-4 md:-mt-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div><h1 className="text-2xl md:text-3xl font-bold">⚙️ Paramètres généraux</h1><p className="text-green-100 mt-1">Personnalisez votre plateforme</p></div>
          <Link href="/admin" className="bg-white text-green-700 px-4 py-2 rounded-lg hover:bg-green-50 transition">← Retour</Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-8">
        {/* Navigation par onglets */}
        <div className="flex gap-2 mb-6 border-b overflow-x-auto bg-white p-2 rounded-t-xl">
          <button onClick={() => setActiveTab('invoice')} className={`px-4 py-2 font-semibold rounded-lg transition ${activeTab === 'invoice' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>📄 Facture</button>
          <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 font-semibold rounded-lg transition ${activeTab === 'categories' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>🏷️ Catégories</button>
          <button onClick={() => setActiveTab('carousel')} className={`px-4 py-2 font-semibold rounded-lg transition ${activeTab === 'carousel' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>🖼️ Carrousel</button>
          <button onClick={() => setActiveTab('promo')} className={`px-4 py-2 font-semibold rounded-lg transition ${activeTab === 'promo' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>📢 Promotion</button>
        </div>

        {/* Onglet Facture */}
        {activeTab === 'invoice' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4 pb-2 border-b">Informations légales</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="block font-medium mb-1">TVA (%)</label><input type="number" value={settings.invoice_tva_rate || '18'} onChange={(e) => updateSetting('invoice_tva_rate', e.target.value)} className="w-full p-2 border rounded-lg" /></div>
              <div><label className="block font-medium mb-1">Timbre fiscal (FCFA)</label><input type="number" value={settings.invoice_timbre || '1000'} onChange={(e) => updateSetting('invoice_timbre', e.target.value)} className="w-full p-2 border rounded-lg" /></div>
              <div><label className="block font-medium mb-1">NINEA</label><input type="text" value={settings.invoice_ninea || '123456789'} onChange={(e) => updateSetting('invoice_ninea', e.target.value)} className="w-full p-2 border rounded-lg" /></div>
              <div><label className="block font-medium mb-1">RC</label><input type="text" value={settings.invoice_rc || 'SN-DKR-2025-00123'} onChange={(e) => updateSetting('invoice_rc', e.target.value)} className="w-full p-2 border rounded-lg" /></div>
              <div className="md:col-span-2"><label className="block font-medium mb-1">Adresse</label><input type="text" value={settings.invoice_address || 'Villa N°15, Sacré Cœur 3, Dakar, Sénégal'} onChange={(e) => updateSetting('invoice_address', e.target.value)} className="w-full p-2 border rounded-lg" /></div>
              <div><label className="block font-medium mb-1">Téléphone</label><input type="text" value={settings.invoice_phone || '76 858 87 88'} onChange={(e) => updateSetting('invoice_phone', e.target.value)} className="w-full p-2 border rounded-lg" /></div>
              <div><label className="block font-medium mb-1">Email</label><input type="email" value={settings.invoice_email || 'contact@sunu-foire.sn'} onChange={(e) => updateSetting('invoice_email', e.target.value)} className="w-full p-2 border rounded-lg" /></div>
            </div>
          </div>
        )}

        {/* Onglet Catégories */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4 pb-2 border-b">Images des catégories</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {['agricole', 'elevage', 'artisanat', 'peche'].map((cat) => (
                <CategoryDropzone
                  key={cat}
                  category={cat}
                  currentUrl={settings.home_categories_images?.[cat] || ''}
                  onUpload={(file: File) => uploadCategoryImage(file, cat)}
                  onUrlChange={(url: string) => handleImageChange('home_categories_images', cat, url)}
                  uploading={uploadingCat === cat}
                />
              ))}
            </div>
          </div>
        )}

        {/* Onglet Carrousel */}
        {activeTab === 'carousel' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4 pb-2 border-b">Images du carrousel</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(settings.home_carousel_images || {}).map(([idx, url]) => (
                <CarouselItem
                  key={idx}
                  index={parseInt(idx)}
                  url={url}
                  onUpdate={(newUrl: string) => handleCarouselChange(parseInt(idx), newUrl)}
                  onRemove={() => removeCarouselImage(parseInt(idx))}
                  onUpload={(file: File) => uploadCarouselImage(file, parseInt(idx))}
                  uploading={uploadingCarousel === parseInt(idx)}
                  uploadProgress={uploadProgress}
                />
              ))}
            </div>
            <button onClick={addCarouselImage} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">+ Ajouter une image</button>
          </div>
        )}

        {/* Onglet Promotion */}
        {activeTab === 'promo' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4 pb-2 border-b">Bandeau promotionnel</h2>
            <div className="space-y-4">
              <div><label className="block font-medium mb-1">Titre</label><input type="text" value={settings.home_promo_title || 'Vous êtes producteur ?'} onChange={(e) => updateSetting('home_promo_title', e.target.value)} className="w-full p-2 border rounded-lg" /></div>
              <div><label className="block font-medium mb-1">Texte</label><textarea value={settings.home_promo_text || 'Rejoignez gratuitement SUNU FOIRE et vendez vos produits directement aux consommateurs'} onChange={(e) => updateSetting('home_promo_text', e.target.value)} className="w-full p-2 border rounded-lg" rows={3} /></div>
              <div><label className="block font-medium mb-1">Texte du bouton</label><input type="text" value={settings.home_promo_button_text || 'Créer un compte vendeur'} onChange={(e) => updateSetting('home_promo_button_text', e.target.value)} className="w-full p-2 border rounded-lg" /></div>
              <div className="bg-green-50 p-4 rounded-lg mt-4">
                <h3 className="font-semibold mb-2">Aperçu</h3>
                <div className="bg-gradient-to-r from-green-700 to-green-600 text-white p-4 rounded-lg text-center">
                  <h3 className="font-bold">{settings.home_promo_title || 'Vous êtes producteur ?'}</h3>
                  <p className="text-sm mt-1">{settings.home_promo_text || 'Rejoignez gratuitement SUNU FOIRE et vendez vos produits directement aux consommateurs'}</p>
                  <button className="mt-2 bg-white text-green-700 px-3 py-1 rounded-full text-sm">{settings.home_promo_button_text || 'Créer un compte vendeur'}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}