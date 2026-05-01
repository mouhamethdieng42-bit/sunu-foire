'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      router.push('/auth/login?redirect=/favorites');
      return;
    }

    const { data } = await supabase
      .from('wishlist')
      .select('*, products(*, profiles(full_name))')
      .eq('user_id', user.user.id);

    setFavorites(data || []);
    setLoading(false);
  };

  const removeFavorite = async (productId: string) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    await supabase
      .from('wishlist')
      .delete()
      .eq('user_id', user.user.id)
      .eq('product_id', productId);

    fetchFavorites();
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">❤️ Mes favoris</h1>

      {favorites.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-500">Vous n'avez pas encore de favoris.</p>
          <Link href="/products" className="text-green-600 mt-4 inline-block">
            Découvrir des produits →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {favorites.map((fav) => (
            <div key={fav.id} className="bg-white border rounded-xl overflow-hidden shadow hover:shadow-lg transition">
              <Link href={`/product/${fav.product_id}`}>
                <img
                  src={fav.products?.image_urls?.[0] || '/placeholder.jpg'}
                  alt={fav.products?.name}
                  className="w-full h-48 object-cover hover:scale-105 transition duration-300"
                />
                <div className="p-4">
                  <h2 className="font-bold text-lg truncate">{fav.products?.name}</h2>
                  <p className="text-green-600 font-bold text-xl mt-1">
                    {fav.products?.price?.toLocaleString()} FCFA
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    {fav.products?.profiles?.full_name || 'Producteur'}
                  </p>
                </div>
              </Link>
              <button
                onClick={() => removeFavorite(fav.product_id)}
                className="w-full bg-red-600 text-white py-2 hover:bg-red-700 transition"
              >
                🗑️ Retirer des favoris
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}