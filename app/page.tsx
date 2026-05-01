'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [popularProducts, setPopularProducts] = useState<any[]>([]);
  const [featuredSellers, setFeaturedSellers] = useState<any[]>([]);
  const [stats, setStats] = useState({ products: 0, sellers: 0, orders: 0 });
  const [settings, setSettings] = useState<any>({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [carouselImages, setCarouselImages] = useState<any[]>([]);

  useEffect(() => {
    getUser();
    getRecentProducts();
    getStats();
    getPopularProducts();
    getFeaturedSellers();
    getSettings();
  }, []);

  useEffect(() => {
    if (settings.home_carousel_images) {
      const images = Object.values(settings.home_carousel_images);
      setCarouselImages(images);
    }
  }, [settings]);

  useEffect(() => {
    if (carouselImages.length > 0) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [carouselImages]);

  const getUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  };

  const getSettings = async () => {
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
  };

  const getRecentProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(8);
    if (data) setProducts(data);
  };

  const getPopularProducts = async () => {
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity, products(*, profiles(full_name))');
    
    if (orderItems && orderItems.length > 0) {
      const counts: any = {};
      orderItems.forEach((item: any) => {
        const id = item.product_id;
        if (!counts[id]) {
          counts[id] = { ...item.products, order_count: 0 };
        }
        counts[id].order_count += item.quantity;
      });
      const sorted = Object.values(counts).sort((a: any, b: any) => b.order_count - a.order_count).slice(0, 4);
      setPopularProducts(sorted);
    } else {
      const { data: recentProducts } = await supabase
        .from('products')
        .select('*, profiles(full_name)')
        .limit(4);
      if (recentProducts) setPopularProducts(recentProducts);
    }
  };

  const getFeaturedSellers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'seller')
      .limit(4);
    
    if (data) {
      const sellersWithCount = await Promise.all(
        data.map(async (seller) => {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('seller_id', seller.id);
          return { ...seller, product_count: count || 0 };
        })
      );
      setFeaturedSellers(sellersWithCount);
    }
  };

  const getStats = async () => {
    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    const { count: sellersCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'seller');
    const { count: ordersCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    setStats({
      products: productsCount || 0,
      sellers: sellersCount || 0,
      orders: ordersCount || 0,
    });
  };

  const currentImage = carouselImages[currentImageIndex] || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      
      {/* Hero Section avec carrousel dynamique */}
      <section className="relative h-[500px] md:h-[600px] overflow-hidden">
        {carouselImages.length > 0 && currentImage && (
          <div className="absolute inset-0 transition-opacity duration-1000">
            <img src={currentImage} alt="Hero" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50"></div>
          </div>
        )}
        
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
          {carouselImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentImageIndex(idx)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                currentImageIndex === idx ? 'bg-white w-6' : 'bg-white/50'
              }`}
            />
          ))}
        </div>

        <div className="relative z-10 h-full flex items-center justify-center text-center text-white">
          <div className="max-w-4xl mx-auto px-4">
            <div className="inline-block animate-bounce text-5xl md:text-6xl mb-4">🇸🇳</div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">SUNU FOIRE</h1>
            <p className="text-xl md:text-2xl text-green-100 max-w-3xl mx-auto mb-4">
              La marketplace qui valorise <span className="font-bold text-white">les producteurs locaux</span> du Sénégal
            </p>
            <p className="text-green-200 text-lg mb-10">
              🚚 Livraison directe | 💳 Wave & Orange Money | 🤝 100% local
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/products" className="bg-white text-green-700 hover:bg-green-50 px-8 py-3 rounded-full font-bold text-lg transition transform hover:scale-105 shadow-lg">🛒 Explorer les produits</Link>
              {!user && <Link href="/auth/register" className="bg-green-500 hover:bg-green-400 text-white px-8 py-3 rounded-full font-bold text-lg transition transform hover:scale-105 shadow-lg">📝 Vendre mes produits</Link>}
            </div>
          </div>
        </div>
      </section>

      {/* Statistiques */}
      <section className="py-12 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div><div className="text-3xl font-bold text-green-600">{stats.products}+</div><div className="text-gray-500">Produits</div></div>
            <div><div className="text-3xl font-bold text-green-600">{stats.sellers}+</div><div className="text-gray-500">Producteurs</div></div>
            <div><div className="text-3xl font-bold text-green-600">{stats.orders}+</div><div className="text-gray-500">Commandes</div></div>
            <div><div className="text-3xl font-bold text-green-600">100%</div><div className="text-gray-500">Local</div></div>
          </div>
        </div>
      </section>

      {/* Catégories avec images dynamiques */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-10">Nos catégories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/products?category=agricole" className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition">
              <img src={settings.home_categories_images?.agricole || 'https://images.pexels.com/photos/164504/pexels-photo-164504.jpeg?w=400&h=300&fit=crop'} className="w-full h-48 object-cover group-hover:scale-110 transition duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white"><div className="text-2xl mb-1">🌾</div><div className="font-bold text-lg">Agricole</div></div>
            </Link>
            <Link href="/products?category=elevage" className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition">
              <img src={settings.home_categories_images?.elevage || 'https://images.pexels.com/photos/139139/pexels-photo-139139.jpeg?w=400&h=300&fit=crop'} className="w-full h-48 object-cover group-hover:scale-110 transition duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white"><div className="text-2xl mb-1">🐄</div><div className="font-bold text-lg">Élevage</div></div>
            </Link>
            <Link href="/products?category=artisanat" className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition">
              <img src={settings.home_categories_images?.artisanat || 'https://images.pexels.com/photos/235725/pexels-photo-235725.jpeg?w=400&h=300&fit=crop'} className="w-full h-48 object-cover group-hover:scale-110 transition duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white"><div className="text-2xl mb-1">🎨</div><div className="font-bold text-lg">Artisanat</div></div>
            </Link>
            <Link href="/products?category=peche" className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition">
              <img src={settings.home_categories_images?.peche || 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?w=400&h=300&fit=crop'} className="w-full h-48 object-cover group-hover:scale-110 transition duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white"><div className="text-2xl mb-1">🐟</div><div className="font-bold text-lg">Pêche</div></div>
            </Link>
          </div>
        </div>
      </section>

      {/* Articles populaires */}
      {popularProducts.length > 0 && (
        <section className="py-12 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <div><h2 className="text-2xl md:text-3xl font-bold text-gray-800">🔥 Articles populaires</h2><p className="text-gray-500 mt-1">Les plus commandés du moment</p></div>
              <Link href="/products" className="text-green-600 hover:text-green-700 font-semibold">Voir tout →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {popularProducts.map((product, index) => (
                <Link key={index} href="/products" className="group bg-gray-50 rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition transform hover:-translate-y-1">
                  <div className="relative overflow-hidden h-48">
                    {product.image_urls?.[0] ? <img src={product.image_urls[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" /> : <div className="w-full h-full bg-gradient-to-br from-green-200 to-green-100 flex items-center justify-center text-4xl">🌾</div>}
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full">⭐ Populaire</div>
                  </div>
                  <div className="p-4"><h3 className="font-bold text-gray-800 group-hover:text-green-600 transition">{product.name}</h3><p className="text-green-600 font-bold text-xl mt-1">{product.price?.toLocaleString()} FCFA</p><div className="flex items-center justify-between mt-2"><span className="text-gray-400 text-sm">👤 {product.profiles?.full_name?.split(' ')[0] || 'Producteur'}</span><span className="text-yellow-500 text-sm">🔥 {product.order_count || 0} commandes</span></div></div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Producteurs en vedette */}
      {featuredSellers.length > 0 && (
        <section className="py-12 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-8"><h2 className="text-2xl md:text-3xl font-bold text-gray-800">🏷️ Producteurs en vedette</h2><p className="text-gray-500 mt-1">Découvrez nos meilleurs vendeurs locaux</p></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredSellers.map((seller) => (
                <Link key={seller.id} href="/products" className="bg-white rounded-xl p-4 text-center shadow-md hover:shadow-xl transition transform hover:-translate-y-1">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center text-3xl mb-3">🌾</div>
                  <h3 className="font-bold text-gray-800">{seller.full_name || 'Producteur'}</h3><p className="text-green-600 text-sm mt-1">{seller.product_count} produits</p><div className="flex justify-center items-center mt-2 text-yellow-500 text-sm">⭐⭐⭐⭐☆</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bandeau producteur dynamique */}
      <section className="py-16 bg-gradient-to-r from-green-700 to-green-600 text-white">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">{settings.home_promo_title || 'Vous êtes producteur ?'}</h2>
          <p className="text-green-100 text-lg mb-6 max-w-2xl mx-auto">{settings.home_promo_text || 'Rejoignez gratuitement SUNU FOIRE et vendez vos produits directement aux consommateurs'}</p>
          {!user && <Link href="/auth/register" className="bg-white text-green-700 hover:bg-green-50 px-8 py-3 rounded-full font-bold text-lg inline-flex items-center gap-2 transition transform hover:scale-105 shadow-lg">📝 {settings.home_promo_button_text || 'Créer un compte vendeur'}</Link>}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="text-2xl mb-2">🌾 SUNU FOIRE</div>
          <p className="text-sm">© 2025 - La marketplace des producteurs locaux du Sénégal</p>
          <p className="text-xs mt-2">📞 {settings.invoice_phone || '76 858 87 88'} | 📧 {settings.invoice_email || 'contact@sunu-foire.sn'}</p>
        </div>
      </footer>
    </div>
  );
}