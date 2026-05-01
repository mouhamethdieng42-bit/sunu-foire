'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [user, setUser] = useState<any>(null);
  const { addItem } = useCart();

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchReviews();
      getUser();
    }
  }, [id]);

  const getUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  };

  const fetchProduct = async () => {
    const { data } = await supabase
      .from('products')
      .select('*, profiles(full_name, phone)')
      .eq('id', id)
      .single();
    setProduct(data);
  };

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*, profiles(full_name)')
      .eq('product_id', id)
      .order('created_at', { ascending: false });
    setReviews(data || []);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Connectez-vous pour laisser un avis');
      return;
    }

    const { error } = await supabase.from('reviews').insert({
      product_id: id,
      user_id: user.id,
      rating,
      comment,
    });

    if (error) {
      alert('Erreur: ' + error.message);
    } else {
      alert('Avis ajouté !');
      setComment('');
      setRating(5);
      fetchReviews();
    }
  };

  if (!product) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Fil d'Ariane */}
      <div className="text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-green-600">Accueil</Link> / 
        <Link href="/products" className="hover:text-green-600"> Catalogue</Link> / 
        <span className="text-gray-700"> {product.name}</span>
      </div>

      {/* Infos produit */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Image */}
        <div>
          <img
            src={product.image_urls?.[0] || '/placeholder.jpg'}
            alt={product.name}
            className="w-full rounded-xl shadow-lg"
          />
          {/* Miniatures si plusieurs images */}
          {product.image_urls && product.image_urls.length > 1 && (
            <div className="flex gap-2 mt-3">
              {product.image_urls.slice(1, 4).map((url: string, idx: number) => (
                <img
                  key={idx}
                  src={url}
                  alt={`${product.name} ${idx + 2}`}
                  className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80"
                />
              ))}
            </div>
          )}
        </div>

        {/* Détails */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{product.name}</h1>
          <p className="text-green-600 font-bold text-2xl mt-2">
            {product.price.toLocaleString()} FCFA
          </p>

          {/* Stock */}
          {product.stock !== undefined && (
            <p className={`text-sm mt-2 ${product.stock <= 0 ? 'text-red-500 font-bold' : 'text-gray-600'}`}>
              📦 Stock: {product.stock} {product.unit || 'pièce(s)'}
            </p>
          )}

          {/* Étoiles */}
          <div className="flex items-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className={`text-xl ${
                star <= Math.round(averageRating) ? 'text-yellow-500' : 'text-gray-300'
              }`}>★</span>
            ))}
            <span className="text-sm text-gray-500 ml-2">({reviews.length} avis)</span>
          </div>

          {/* Description */}
          <p className="text-gray-600 mt-4">{product.description}</p>

          {/* Catégorie */}
          <p className="text-sm text-gray-400 mt-2">
            {product.category === 'agricole' && '🌾 Catégorie: Agricole'}
            {product.category === 'elevage' && '🐄 Catégorie: Élevage'}
            {product.category === 'artisanat' && '🎨 Catégorie: Artisanat'}
            {product.category === 'peche' && '🐟 Catégorie: Pêche'}
          </p>
          
          {/* Vendeur avec bouton chat interne */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-semibold text-gray-700">👤 Vendeur</p>
            <p className="text-gray-800">{product.profiles?.full_name || 'Producteur local'}</p>
            
            {/* Bouton Contacter via chat interne */}
            <Link
              href={`/messages/new?receiver_id=${product.seller_id}&product_id=${product.id}&product_name=${encodeURIComponent(product.name)}`
              }
              className="inline-block mt-2 bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700"
            >
              💬 Contacter le vendeur
            </Link>
          </div>

          {/* Bouton panier */}
          <button
            onClick={() => addItem(product)}
            disabled={product.stock <= 0}
            className={`mt-6 w-full py-2 rounded-lg transition text-md font-semibold ${
              product.stock > 0
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-400 text-white cursor-not-allowed'
            }`}
          >
            {product.stock > 0 ? '🛒 Ajouter au panier' : '❌ Stock épuisé'}
          </button>
        </div>
      </div>

      {/* Formulaire d'avis - uniquement si connecté */}
      {user && (
        <div className="mt-8 border-t pt-6">
          <h2 className="text-xl font-bold mb-4">Donnez votre avis</h2>
          <form onSubmit={handleSubmitReview} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-medium mb-1">Note</label>
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="p-2 border rounded focus:ring-2 focus:ring-green-500"
              >
                <option value={5}>★★★★★ (5/5) - Excellent</option>
                <option value={4}>★★★★☆ (4/5) - Très bien</option>
                <option value={3}>★★★☆☆ (3/5) - Bien</option>
                <option value={2}>★★☆☆☆ (2/5) - Moyen</option>
                <option value={1}>★☆☆☆☆ (1/5) - Mauvais</option>
              </select>
            </div>

            <textarea
              placeholder="Votre commentaire..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500"
              rows={3}
              required
            />

            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            >
              📝 Publier l'avis
            </button>
          </form>
        </div>
      )}

      {/* Liste des avis */}
      {reviews.length > 0 && (
        <div className="mt-8 border-t pt-6">
          <h2 className="text-xl font-bold mb-4">Avis des clients</h2>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border-b pb-3">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={`text-sm ${
                      star <= review.rating ? 'text-yellow-500' : 'text-gray-300'
                    }`}>★</span>
                  ))}
                  <span className="text-sm font-medium text-gray-600">
                    {review.profiles?.full_name?.split(' ')[0] || 'Client'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(review.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <p className="text-gray-700 mt-1">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Si pas d'avis et pas connecté */}
      {reviews.length === 0 && !user && (
        <div className="mt-8 border-t pt-6 text-center text-gray-500">
          <p>Soyez le premier à donner votre avis sur ce produit !</p>
          <Link href="/auth/login" className="text-green-600 hover:underline mt-2 inline-block">
            Connectez-vous pour laisser un avis
          </Link>
        </div>
      )}
    </div>
  );
}