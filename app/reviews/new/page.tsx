'use client';

import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// Composant interne qui utilise useSearchParams
function NewReviewForm() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('product_id');
  const orderId = searchParams.get('order_id');
  const router = useRouter();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [existingReview, setExistingReview] = useState<any>(null);

  useEffect(() => {
    if (!productId) {
      setError('Produit non spécifié');
      return;
    }
    fetchProductAndReview();
  }, [productId]);

  const fetchProductAndReview = async () => {
    const { data: prod } = await supabase
      .from('products')
      .select('name, seller_id')
      .eq('id', productId)
      .single();
    setProduct(prod);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: review } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();
      setExistingReview(review);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Vous devez être connecté');
      setLoading(false);
      return;
    }

    if (!productId) {
      setError('Produit invalide');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from('reviews')
      .insert({
        product_id: productId,
        user_id: user.id,
        rating,
        comment,
        order_id: orderId || null,
      });

    if (insertError) {
      setError(insertError.message);
    } else {
      alert('✅ Merci pour votre avis !');
      router.push(`/product/${productId}`);
    }
    setLoading(false);
  };

  if (error && !productId) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (existingReview) {
    return (
      <div className="p-8 text-center">
        <p className="text-green-600">Vous avez déjà laissé un avis pour ce produit.</p>
        <Link href={`/product/${productId}`} className="text-blue-600 mt-4 inline-block">← Retour au produit</Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">⭐ Laisser un avis</h1>
      {product && <p className="text-gray-600 mb-6">Produit : <strong>{product.name}</strong></p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Note (1 à 5)</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-3xl ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block font-medium mb-1">Commentaire</label>
          <textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-2 border rounded-lg"
            placeholder="Partagez votre expérience..."
            required
          />
        </div>
        {error && <div className="bg-red-50 text-red-600 p-2 rounded">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Envoi...' : 'Envoyer l’avis'}
        </button>
      </form>
    </div>
  );
}

// Composant principal avec Suspense
export default function NewReviewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Chargement...</div>}>
      <NewReviewForm />
    </Suspense>
  );
}