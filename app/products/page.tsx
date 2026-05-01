'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect, Suspense } from 'react';
import { useCart } from '@/context/CartContext';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { addToWishlist, removeFromWishlist } from '@/lib/wishlist';
import { useRouter } from 'next/navigation';

function ProductsContent() {
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get('category');
  const router = useRouter();
  
  const [products, setProducts] = useState<any[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<{ [key: string]: number }>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [averageRatings, setAverageRatings] = useState<{ [key: string]: number }>({});
  const [user, setUser] = useState<any>(null);
  const [wishlistStatus, setWishlistStatus] = useState<{ [key: string]: boolean }>({});
  const [cartItems, setCartItems] = useState<{ [key: string]: number }>({});
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [addingToCart, setAddingToCart] = useState<{ [key: string]: boolean }>({});
  const { addItem } = useCart();

  // Charger l'utilisateur et ses favoris
  useEffect(() => {
    const getUserAndWishlist = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);
      
      if (userData.user) {
        const { data: wishlistData } = await supabase
          .from('wishlist')
          .select('product_id')
          .eq('user_id', userData.user.id);
        
        const status: { [key: string]: boolean } = {};
        wishlistData?.forEach((item) => {
          status[item.product_id] = true;
        });
        setWishlistStatus(status);
      }
    };
    getUserAndWishlist();
  }, []);

  // Charger le panier depuis localStorage
  const loadCart = () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      const items = JSON.parse(savedCart);
      const cartMap: { [key: string]: number } = {};
      items.forEach((item: any) => {
        cartMap[item.id] = item.quantity;
      });
      setCartItems(cartMap);
    } else {
      setCartItems({});
    }
  };

  useEffect(() => {
    loadCart();
  }, [refreshKey]);

  // Écouter les changements du panier dans d'autres onglets
  useEffect(() => {
    const handleStorageChange = () => loadCart();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const fetchProducts = async () => {
    let query = supabase.from('products').select(`
      *,
      profiles (
        full_name,
        phone
      )
    `);

    if (categoryFilter) {
      query = query.eq('category', categoryFilter);
    }

    const { data } = await query;
    
    let filteredData = data || [];
    if (searchTerm) {
      filteredData = filteredData.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setProducts([...filteredData]);
    
    // Initialiser les quantités
    const qty: { [key: string]: number } = {};
    filteredData.forEach(product => {
      qty[product.id] = 1;
    });
    setQuantities(qty);
  };

  const fetchRatings = async () => {
    const { data } = await supabase.from('reviews').select('product_id, rating');
    if (data) {
      const averages: { [key: string]: { sum: number; count: number } } = {};
      data.forEach((review) => {
        if (!averages[review.product_id]) {
          averages[review.product_id] = { sum: 0, count: 0 };
        }
        averages[review.product_id].sum += review.rating;
        averages[review.product_id].count += 1;
      });
      const result: { [key: string]: number } = {};
      Object.keys(averages).forEach((id) => {
        result[id] = averages[id].sum / averages[id].count;
      });
      setAverageRatings(result);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchRatings();
  }, [refreshKey, categoryFilter, searchTerm]);

  const getSelectedIndex = (productId: string) => {
    return selectedPhotoIndex[productId] || 0;
  };

  const setSelectedIndex = (productId: string, index: number) => {
    setSelectedPhotoIndex({ ...selectedPhotoIndex, [productId]: index });
  };

  const handleAddToCart = async (product: any, quantity: number) => {
    if (product.stock <= 0 || product.stock < quantity) {
      alert('Stock insuffisant !');
      return;
    }
    
    setAddingToCart(prev => ({ ...prev, [product.id]: true }));
    
    // Ajouter la quantité sélectionnée
    for (let i = 0; i < quantity; i++) {
      await addItem(product);
    }
    
    // Recharger le panier
    loadCart();
    
    setAddingToCart(prev => ({ ...prev, [product.id]: false }));
  };

  const updateQuantity = (productId: string, delta: number, maxStock: number) => {
    setQuantities(prev => {
      const newQty = Math.max(1, Math.min((prev[productId] || 1) + delta, maxStock));
      return { ...prev, [productId]: newQty };
    });
  };

  const toggleWishlist = async (productId: string) => {
    if (!user) {
      alert('Connectez-vous pour ajouter aux favoris');
      return;
    }

    if (wishlistStatus[productId]) {
      await removeFromWishlist(productId, user.id);
      setWishlistStatus(prev => ({ ...prev, [productId]: false }));
    } else {
      await addToWishlist(productId, user.id);
      setWishlistStatus(prev => ({ ...prev, [productId]: true }));
    }
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">
        {categoryFilter ? `Catégorie : ${categoryFilter}` : 'Catalogue'}
      </h1>

      {/* Barre de recherche */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="🔍 Rechercher un produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        {searchTerm && (
          <p className="text-sm text-gray-500 mt-1">
            {products.length} résultat(s) pour "{searchTerm}"
          </p>
        )}
      </div>
      
      {products.length === 0 && searchTerm && (
        <div className="text-center py-10 text-gray-500">
          Aucun produit trouvé pour "{searchTerm}"
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {products.map((product) => {
          const images = product.image_urls || [];
          const currentIndex = getSelectedIndex(product.id);
          const currentImage = images[currentIndex];
          const isInCart = cartItems[product.id] > 0;
          const quantity = quantities[product.id] || 1;
          const isAdding = addingToCart[product.id];

          return (
            <div key={product.id} className="border rounded-lg p-3 md:p-4 shadow hover:shadow-lg transition group bg-white">
              {images.length > 0 && (
                <div className="relative overflow-hidden rounded-lg mb-3 cursor-pointer" onClick={() => window.open(currentImage, '_blank')}>
                  <img 
                    src={currentImage} 
                    alt={product.name}
                    className="w-full h-40 md:h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              )}
              
              <div className="flex justify-between items-start">
                <Link href={`/product/${product.id}`} className="flex-1">
                  <h2 className="text-base md:text-xl font-semibold hover:text-green-600 transition">
                    {product.name}
                  </h2>
                </Link>
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className="text-2xl focus:outline-none transition-transform hover:scale-110"
                >
                  {wishlistStatus[product.id] ? '❤️' : '🤍'}
                </button>
              </div>
              
              <p className="text-green-600 font-bold text-md md:text-lg">{product.price.toLocaleString()} FCFA</p>
              
              {/* Étoiles */}
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className={`text-sm ${
                    star <= Math.round(averageRatings[product.id] || 0)
                      ? 'text-yellow-500'
                      : 'text-gray-300'
                  }`}>★</span>
                ))}
                <span className="text-xs text-gray-400 ml-1">
                  ({averageRatings[product.id]?.toFixed(1) || 0})
                </span>
              </div>

              {product.stock !== undefined && (
                <p className={`text-xs md:text-sm mt-1 ${product.stock <= 0 ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                  📦 Stock: {product.stock} {product.unit || 'pièce(s)'}
                </p>
              )}
              <p className="text-xs md:text-sm text-gray-400 mb-2 mt-1">
                {product.category === 'agricole' && '🌾 Agricole'}
                {product.category === 'elevage' && '🐄 Élevage'}
                {product.category === 'artisanat' && '🎨 Artisanat'}
                {product.category === 'peche' && '🐟 Pêche'}
              </p>
              <Link href={`/product/${product.id}`} className="block">
                <p className="text-gray-600 text-sm line-clamp-2">{product.description}</p>
              </Link>
              
              <div className="border-t pt-2 md:pt-3 mt-2">
                <p className="text-xs md:text-sm font-semibold">
                  Vendeur : {product.profiles?.full_name || 'Producteur'}
                </p>
                {product.seller_phone && (
                  <a 
                    href={`tel:${product.seller_phone}`} 
                    className="inline-block mt-2 bg-blue-600 text-white text-xs md:text-sm px-2 md:px-3 py-1 rounded hover:bg-blue-700 transition"
                  >
                    📞 Contacter
                  </a>
                )}
              </div>

              {/* Zone ajout au panier */}
              <div className="mt-3 space-y-2">
                {/* Sélecteur de quantité (visible seulement si non dans le panier) */}
                {!isInCart && product.stock > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Quantité:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(product.id, -1, product.stock)}
                        className="w-7 h-7 bg-gray-200 rounded-full hover:bg-gray-300 transition flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-semibold">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, 1, product.stock)}
                        className="w-7 h-7 bg-gray-200 rounded-full hover:bg-gray-300 transition flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* Bouton principal */}
                {isInCart ? (
                  <button
                    onClick={() => router.push('/cart')}
                    className="w-full py-2 rounded-lg transition text-sm md:text-base bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    👁️ Voir le panier ({cartItems[product.id]})
                  </button>
                ) : (
                  <button
                    onClick={() => handleAddToCart(product, quantity)}
                    disabled={product.stock <= 0 || isAdding}
                    className={`w-full py-2 rounded-lg transition text-sm md:text-base flex items-center justify-center gap-2 ${
                      product.stock > 0
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-400 text-white cursor-not-allowed'
                    }`}
                  >
                    {isAdding ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Ajout...
                      </>
                    ) : (
                      <>
                        🛒 Ajouter au panier
                        {quantity > 1 && <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">x{quantity}</span>}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Chargement...</div>}>
      <ProductsContent />
    </Suspense>
  );
}