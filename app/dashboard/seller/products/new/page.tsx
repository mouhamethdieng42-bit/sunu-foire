'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function NewProductPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  // États du formulaire
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState('pièce');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  
  // États pour les médias
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  
  // Onglet actif
  const [activeTab, setActiveTab] = useState('general');

  const categories = [
    { value: 'agricole', label: '🌾 Agricole', icon: '🌾' },
    { value: 'elevage', label: '🐄 Élevage', icon: '🐄' },
    { value: 'artisanat', label: '🎨 Artisanat', icon: '🎨' },
    { value: 'peche', label: '🐟 Pêche', icon: '🐟' },
  ];

  const units = ['pièce', 'kg', 'litre', 'sachet', 'botte', 'douzaine', 'bouteille', 'carton'];

  // Gestion des images
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newFiles = [...imageFiles, ...files].slice(0, 10);
      setImageFiles(newFiles);
      
      const previews = newFiles.map(file => URL.createObjectURL(file));
      setImagePreviews(previews);
    }
  };

  // Gestion des vidéos
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newFiles = [...videoFiles, ...files].slice(0, 3);
      setVideoFiles(newFiles);
      
      const previews = newFiles.map(file => URL.createObjectURL(file));
      setVideoPreviews(previews);
    }
  };

  // Supprimer une image
  const removeImage = (index: number) => {
    const newFiles = [...imageFiles];
    const newPreviews = [...imagePreviews];
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  // Supprimer une vidéo
  const removeVideo = (index: number) => {
    const newFiles = [...videoFiles];
    const newPreviews = [...videoPreviews];
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setVideoFiles(newFiles);
    setVideoPreviews(newPreviews);
  };

  // Upload vers Cloudinary
  const uploadFile = async (file: File, type: 'image' | 'video') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
    if (type === 'video') {
      formData.append('resource_type', 'video');
    }

    const url = type === 'image' 
      ? `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`
      : `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`;

    const response = await fetch(url, { method: 'POST', body: formData });
    const data = await response.json();
    return data.secure_url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUploading(true);
    setUploadProgress(0);

    // Validation
    if (!name || !price || !category) {
      setError('Veuillez remplir tous les champs obligatoires');
      setUploading(false);
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Non connecté');

      // Upload des images
      const imageUrls: string[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        setUploadProgress(Math.round((i / imageFiles.length) * 50));
        const url = await uploadFile(imageFiles[i], 'image');
        imageUrls.push(url);
      }

      // Upload des vidéos
      const videoUrls: string[] = [];
      for (let i = 0; i < videoFiles.length; i++) {
        setUploadProgress(50 + Math.round((i / videoFiles.length) * 50));
        const url = await uploadFile(videoFiles[i], 'video');
        videoUrls.push(url);
      }

      setUploadProgress(100);

      // Insertion dans la base
      const { error: insertError } = await supabase.from('products').insert({
        seller_id: user.user.id,
        name,
        price: parseInt(price),
        stock: parseInt(stock) || 0,
        unit,
        description,
        category,
        image_urls: imageUrls,
        video_urls: videoUrls,
      });

      if (insertError) throw new Error(insertError.message);

      alert('✅ Produit ajouté avec succès !');
      router.push('/dashboard/seller');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        
        {/* En-tête */}
        <div className="mb-6">
          <Link href="/dashboard/seller" className="text-green-600 hover:underline mb-2 inline-block">
            ← Retour au dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold mt-2">➕ Nouveau produit</h1>
          <p className="text-gray-500">Ajoutez un produit à votre boutique</p>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 font-semibold ${activeTab === 'general' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500'}`}
          >
            📝 Informations
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`px-4 py-2 font-semibold ${activeTab === 'media' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500'}`}
          >
            🖼️ Photos & Vidéos ({imageFiles.length + videoFiles.length})
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 font-semibold ${activeTab === 'preview' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500'}`}
          >
            👁️ Aperçu
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Onglet Informations */}
          {activeTab === 'general' && (
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du produit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Tomates bio, Miel local, Tissu tissé..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prix <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      required
                    />
                    <span className="absolute right-3 top-2 text-gray-400">FCFA</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantité en stock</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unité</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    {units.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  placeholder="Décrivez votre produit (ingrédients, provenance, avantages...)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {description.length} caractères
                </p>
              </div>
            </div>
          )}

          {/* Onglet Médias */}
          {activeTab === 'media' && (
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
              {/* Photos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📸 Photos du produit</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                  >
                    📁 Choisir des images
                  </button>
                  <p className="text-xs text-gray-400 mt-2">PNG, JPG jusqu'à 10MB. Max 10 photos</p>
                </div>
                
                {/* Prévisualisation */}
                {imagePreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative group">
                        <img src={preview} alt={`Aperçu ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs hover:bg-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vidéos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🎬 Vidéos du produit (optionnel)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition">
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    ref={videoInputRef}
                    onChange={handleVideoSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                  >
                    🎥 Choisir des vidéos
                  </button>
                  <p className="text-xs text-gray-400 mt-2">MP4, MOV jusqu'à 50MB. Max 3 vidéos</p>
                </div>
                
                {/* Prévisualisation vidéo */}
                {videoPreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {videoPreviews.map((preview, idx) => (
                      <div key={idx} className="relative group">
                        <video src={preview} className="w-full h-24 object-cover rounded-lg" controls />
                        <button
                          type="button"
                          onClick={() => removeVideo(idx)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs hover:bg-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Onglet Aperçu */}
          {activeTab === 'preview' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="border rounded-lg overflow-hidden">
                {imagePreviews[0] && (
                  <img src={imagePreviews[0]} alt={name} className="w-full h-64 object-cover" />
                )}
                <div className="p-4">
                  <h2 className="text-xl font-bold">{name || 'Nom du produit'}</h2>
                  <p className="text-green-600 font-bold text-2xl mt-1">
                    {price ? `${parseInt(price).toLocaleString()} FCFA` : '0 FCFA'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Stock: {stock || 0} {unit}</p>
                  <p className="text-gray-600 mt-2">{description || 'Description du produit...'}</p>
                  <div className="mt-4 pt-3 border-t">
                    <p className="text-sm text-gray-500">
                      {categories.find(c => c.value === category)?.label || 'Catégorie non sélectionnée'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Barre de progression */}
          {uploading && (
            <div className="mt-6">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2 text-center">Upload en cours... {uploadProgress}%</p>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Boutons */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Publication en cours...
                </>
              ) : (
                '📢 Publier le produit'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}