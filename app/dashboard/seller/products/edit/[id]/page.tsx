'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';


export default function EditProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  // États du formulaire
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState('pièce');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [existingVideos, setExistingVideos] = useState<string[]>([]);
  
  // États pour les nouveaux médias
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [newVideoFiles, setNewVideoFiles] = useState<File[]>([]);
  const [newVideoPreviews, setNewVideoPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  
  // Onglet actif
  const [activeTab, setActiveTab] = useState('general');

  const categories = [
    { value: 'agricole', label: '🌾 Agricole' },
    { value: 'elevage', label: '🐄 Élevage' },
    { value: 'artisanat', label: '🎨 Artisanat' },
    { value: 'peche', label: '🐟 Pêche' },
  ];

  const units = ['pièce', 'kg', 'litre', 'sachet', 'botte', 'douzaine', 'bouteille', 'carton'];

  // Charger le produit
  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (data) {
      setName(data.name || '');
      setPrice(data.price?.toString() || '');
      setStock(data.stock?.toString() || '');
      setUnit(data.unit || 'pièce');
      setDescription(data.description || '');
      setCategory(data.category || '');
      setExistingImages(data.image_urls || []);
      setExistingVideos(data.video_urls || []);
    }
    setLoading(false);
  };

  // Gestion nouvelles images
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setNewImageFiles(files);
      const previews = files.map(file => URL.createObjectURL(file));
      setNewImagePreviews(previews);
    }
  };

  // Gestion nouvelles vidéos
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setNewVideoFiles(files);
      const previews = files.map(file => URL.createObjectURL(file));
      setNewVideoPreviews(previews);
    }
  };

  // Supprimer image existante
  const removeExistingImage = (index: number) => {
    const newImages = [...existingImages];
    newImages.splice(index, 1);
    setExistingImages(newImages);
  };

  // Supprimer vidéo existante
  const removeExistingVideo = (index: number) => {
    const newVideos = [...existingVideos];
    newVideos.splice(index, 1);
    setExistingVideos(newVideos);
  };

  // Supprimer nouvelle image
  const removeNewImage = (index: number) => {
    const newFiles = [...newImageFiles];
    const newPreviews = [...newImagePreviews];
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setNewImageFiles(newFiles);
    setNewImagePreviews(newPreviews);
  };

  // Supprimer nouvelle vidéo
  const removeNewVideo = (index: number) => {
    const newFiles = [...newVideoFiles];
    const newPreviews = [...newVideoPreviews];
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setNewVideoFiles(newFiles);
    setNewVideoPreviews(newPreviews);
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

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Non connecté');

      let allImages = [...existingImages];
      let allVideos = [...existingVideos];

      // Upload des nouvelles images
      for (const file of newImageFiles) {
        const url = await uploadFile(file, 'image');
        allImages.push(url);
      }

      // Upload des nouvelles vidéos
      for (const file of newVideoFiles) {
        const url = await uploadFile(file, 'video');
        allVideos.push(url);
      }

      // Mise à jour du produit
      const { error: updateError } = await supabase
        .from('products')
        .update({
          name,
          price: parseInt(price),
          stock: parseInt(stock) || 0,
          unit,
          description,
          category,
          image_urls: allImages,
          video_urls: allVideos,
        })
        .eq('id', id);

      if (updateError) throw new Error(updateError.message);

      alert('✅ Produit modifié avec succès !');
      router.push('/dashboard/seller');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement du produit...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        
        {/* En-tête */}
        <div className="mb-6">
          <Link href="/dashboard/seller" className="text-green-600 hover:underline mb-2 inline-block">
            ← Retour au dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold mt-2">✏️ Modifier le produit</h1>
          <p className="text-gray-500">Modifiez les informations de votre produit</p>
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
            🖼️ Photos & Vidéos
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {activeTab === 'general' && (
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du produit</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix (FCFA)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Sélectionner</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unité</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
              {/* Images existantes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📸 Photos actuelles</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {existingImages.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} className="w-full h-24 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(idx)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vidéos existantes */}
              {existingVideos.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">🎬 Vidéos actuelles</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {existingVideos.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <video src={url} className="w-full h-24 object-cover rounded-lg" controls />
                        <button
                          type="button"
                          onClick={() => removeExistingVideo(idx)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ajouter nouvelles images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">➕ Ajouter des photos</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
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
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg"
                  >
                    📁 Choisir des images
                  </button>
                </div>
                {newImagePreviews.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {newImagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative">
                        <img src={preview} className="w-full h-24 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => removeNewImage(idx)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ajouter nouvelles vidéos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">➕ Ajouter des vidéos</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
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
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg"
                  >
                    🎥 Choisir des vidéos
                  </button>
                </div>
                {newVideoPreviews.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {newVideoPreviews.map((preview, idx) => (
                      <div key={idx} className="relative">
                        <video src={preview} className="w-full h-24 object-cover rounded-lg" controls />
                        <button
                          type="button"
                          onClick={() => removeNewVideo(idx)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs"
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

          {error && (
            <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {uploading ? 'Enregistrement...' : '💾 Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}