'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export async function generateStaticParams() {
  return [];
}

export default function SellerShopPage() {
  const { id } = useParams();
  const [seller, setSeller] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [reviews, setReviews] = useState<any[]>([]);
  const { addItem } = useCart();

  useEffect(() => {
    if (id) {
      fetchSeller();
      fetchProducts();
      fetchSellerReviews();
    }
  }, [id]);

  useEffect(() => {
    filterAndSortProducts();
  }, [categoryFilter, sortBy, products]);

  const fetchSeller = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    setSeller(data);
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*, profiles(full_name)')
      .eq('seller_id', id)
      .order('created_at', { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  const fetchSellerReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*, profiles(full_name)')
      .in('product_id', products.map(p => p.id));
    setReviews(data || []);
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];

    // Filtre par catégorie
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    // Tri
    switch (sortBy) {
      case 'price_asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      default:
        break;
    }

    setFilteredProducts(filtered);
  };

  const categories = [
    { value: 'all', label: 'Tous', icon: '📦' },
    { value: 'agricole', label: 'Agricole', icon: '🌾' },
    { value: 'elevage', label: 'Élevage', icon: '🐄' },
    { value: 'artisanat', label: 'Artisanat', icon: '🎨' },
    { value: 'peche', label: 'Pêche', icon: '🐟' },
  ];

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Chargement de la boutique...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Bannière */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-green-700 to-green-600">
        {seller?.banner_url && (
          <img src={seller.banner_url} alt="Bannière" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/30"></div>
        
        {/* Photo de profil */}
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 md:left-8 md:transform-none">
          <div className="w-24 h-24 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center text-4xl overflow-hidden">
            {seller?.avatar_url ? (
              <img src={seller.avatar_url} alt={seller.full_name} className="w-full h-full object-cover" />
            ) : (
              <span>🌾</span>
            )}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-6xl mx-auto px-4 pt-16 pb-8">
        
        {/* Infos vendeur */}
        <div className="text-center md:text-left mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">{seller?.full_name || 'Producteur local'}</h1>
          {seller?.location && (
            <p className="text-gray-500 mt-1">📍 {seller.location}</p>
          )}
          <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-3">
            <div className="flex items-center gap-1">
              <span className="text-yellow-500">★</span>
              <span className="font-semibold">{averageRating.toFixed(1)}</span>
              <span className="text-gray-400">({reviews.length} avis)</span>
            </div>
            <div className="flex items-center gap-1">
              <span>📦</span>
              <span>{products.length} produits</span>
            </div>
            <div className="flex items-center gap-1">
              <span>💰</span>
              <span>{seller?.total_sales?.toLocaleString() || 0} FCFA de ventes</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {seller?.bio && (
          <div className="bg-white rounded-xl p-6 mb-8 shadow-sm">
            <h2 className="font-bold text-lg mb-2">📝 À propos</h2>
            <p className="text-gray-600">{seller.bio}</p>
          </div>
        )}

        {/* Filtres et tri */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategoryFilter(cat.value)}
                className={`px-4 py-2 rounded-full text-sm transition ${
                  categoryFilter === cat.value
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-white text-sm"
          >
            <option value="newest">📅 Plus récents</option>
            <option value="price_asc">💰 Prix croissant</option>
            <option value="price_desc">💰 Prix décroissant</option>
          </select>
        </div>

        {/* Grille de produits */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <p className="text-gray-500">Aucun produit dans cette catégorie.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition group">
                <Link href={`/product/${product.id}`}>
                  <div className="relative h-56 overflow-hidden">
                    {product.image_urls?.[0] && (
                      <img 
                        src={product.image_urls[0]} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    )}
                    {product.stock <= 0 && (
                      <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                        Rupture
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg group-hover:text-green-600 transition">{product.name}</h3>
                    <p className="text-green-600 font-bold text-xl mt-1">{product.price.toLocaleString()} FCFA</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {product.category === 'agricole' && '🌾 Agricole'}
                      {product.category === 'elevage' && '🐄 Élevage'}
                      {product.category === 'artisanat' && '🎨 Artisanat'}
                      {product.category === 'peche' && '🐟 Pêche'}
                    </p>
                  </div>
                </Link>
                <div className="p-4 pt-0">
                  <button
                    onClick={() => addItem(product)}
                    disabled={product.stock <= 0}
                    className={`w-full py-2 rounded-lg transition ${
                      product.stock > 0
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {product.stock > 0 ? '🛒 Ajouter au panier' : '❌ Indisponible'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}