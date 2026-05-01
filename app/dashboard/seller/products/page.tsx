'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SellerProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      router.push('/auth/login');
      return;
    }

    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', user.user.id)
      .order('created_at', { ascending: false });

    setProducts(data || []);
    setLoading(false);
  };

  const deleteProduct = async (id: string) => {
    if (confirm('⚠️ Supprimer ce produit ? Cette action est irréversible.')) {
      await supabase.from('products').delete().eq('id', id);
      fetchProducts();
    }
  };

  const updateStock = async (id: string, newStock: number) => {
    await supabase.from('products').update({ stock: newStock }).eq('id', id);
    fetchProducts();
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">📦 Mes produits</h1>
        <Link
          href="/dashboard/seller/products/new"
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          + Ajouter un produit
        </Link>
      </div>

      {/* Barre de recherche */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="🔍 Rechercher un produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
        />
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-500">Aucun produit trouvé</p>
          <Link href="/dashboard/seller/products/new" className="text-green-600 mt-2 inline-block">
            Ajouter votre premier produit
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Produit</th>
                <th className="p-3 text-left">Prix</th>
                <th className="p-3 text-left">Stock</th>
                <th className="p-3 text-left">Statut</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {product.image_urls?.[0] && (
                        <img src={product.image_urls[0]} alt={product.name} className="w-10 h-10 object-cover rounded" />
                      )}
                      <span className="font-medium">{product.name}</span>
                    </div>
                   </td>
                  <td className="p-3 text-green-600 font-semibold">{product.price.toLocaleString()} FCFA</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateStock(product.id, (product.stock || 0) - 1)}
                        className="w-6 h-6 bg-gray-200 rounded hover:bg-gray-300"
                        disabled={product.stock <= 0}
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{product.stock || 0}</span>
                      <button
                        onClick={() => updateStock(product.id, (product.stock || 0) + 1)}
                        className="w-6 h-6 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        +
                      </button>
                    </div>
                   </td>
                  <td className="p-3">
                    {product.stock <= 0 ? (
                      <span className="text-red-600 text-sm">Rupture</span>
                    ) : product.stock <= 5 ? (
                      <span className="text-orange-600 text-sm">Stock faible</span>
                    ) : (
                      <span className="text-green-600 text-sm">Disponible</span>
                    )}
                   </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/seller/products/edit/${product.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Modifier
                      </Link>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Supprimer
                      </button>
                    </div>
                   </td>
                 </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}