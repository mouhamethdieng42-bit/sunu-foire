'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, categoryFilter, stockFilter, products]);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Recherche
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre catégorie
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    // Filtre stock
    if (stockFilter === 'low') {
      filtered = filtered.filter(p => p.stock <= 5);
    } else if (stockFilter === 'out') {
      filtered = filtered.filter(p => p.stock === 0);
    } else if (stockFilter === 'in') {
      filtered = filtered.filter(p => p.stock > 0);
    }

    setFilteredProducts(filtered);
  };

  const updateProduct = async (id: string, field: string, value: any) => {
    await supabase.from('products').update({ [field]: value }).eq('id', id);
    fetchProducts();
    setEditingProduct(null);
  };

  const deleteProduct = async (id: string) => {
    if (confirm('⚠️ Supprimer ce produit ? Cette action est irréversible.')) {
      await supabase.from('products').delete().eq('id', id);
      fetchProducts();
    }
  };

  const stats = {
    total: products.length,
    lowStock: products.filter(p => p.stock <= 5 && p.stock > 0).length,
    outStock: products.filter(p => p.stock === 0).length,
    totalValue: products.reduce((sum, p) => sum + (p.price * p.stock), 0),
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">📦 Gestion des produits</h1>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-blue-500">
          <p className="text-gray-500 text-sm">Total produits</p>
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-yellow-500">
          <p className="text-gray-500 text-sm">Stock faible (&lt;5)</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-red-500">
          <p className="text-gray-500 text-sm">Rupture de stock</p>
          <p className="text-2xl font-bold text-red-600">{stats.outStock}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow border-l-4 border-green-500">
          <p className="text-gray-500 text-sm">Valeur totale du stock</p>
          <p className="text-2xl font-bold text-green-600">{stats.totalValue.toLocaleString()} FCFA</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-xl shadow mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">🔍 Rechercher</label>
          <input
            type="text"
            placeholder="Nom du produit ou vendeur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">📂 Catégorie</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Toutes</option>
            <option value="agricole">🌾 Agricole</option>
            <option value="elevage">🐄 Élevage</option>
            <option value="artisanat">🎨 Artisanat</option>
            <option value="peche">🐟 Pêche</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">📦 Stock</label>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Tous</option>
            <option value="in">En stock</option>
            <option value="low">Stock faible (&lt;5)</option>
            <option value="out">Rupture</option>
          </select>
        </div>
        <div>
          <button
            onClick={() => {
              setSearchTerm('');
              setCategoryFilter('all');
              setStockFilter('all');
            }}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Tableau des produits */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left text-sm font-semibold">Produit</th>
                <th className="p-3 text-left text-sm font-semibold">Vendeur</th>
                <th className="p-3 text-left text-sm font-semibold">Prix</th>
                <th className="p-3 text-left text-sm font-semibold">Stock</th>
                <th className="p-3 text-left text-sm font-semibold">Catégorie</th>
                <th className="p-3 text-left text-sm font-semibold">Actions</th>
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
                  <td className="p-3 text-sm">{product.profiles?.full_name || '-'}</td>
                  <td className="p-3">
                    {editingProduct === product.id ? (
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-24 px-2 py-1 border rounded"
                        autoFocus
                      />
                    ) : (
                      <span className="font-semibold text-green-600">{product.price.toLocaleString()} FCFA</span>
                    )}
                  </td>
                  <td className="p-3">
                    {editingProduct === product.id ? (
                      <input
                        type="number"
                        value={editStock}
                        onChange={(e) => setEditStock(e.target.value)}
                        className="w-20 px-2 py-1 border rounded"
                      />
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs ${
                        product.stock <= 0 ? 'bg-red-100 text-red-700' :
                        product.stock <= 5 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {product.stock} {product.unit}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-sm">
                    {product.category === 'agricole' && '🌾 Agricole'}
                    {product.category === 'elevage' && '🐄 Élevage'}
                    {product.category === 'artisanat' && '🎨 Artisanat'}
                    {product.category === 'peche' && '🐟 Pêche'}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {editingProduct === product.id ? (
                        <>
                          <button
                            onClick={() => updateProduct(product.id, 'price', parseInt(editPrice))}
                            className="bg-green-600 text-white px-2 py-1 rounded text-xs"
                          >
                            💾
                          </button>
                          <button
                            onClick={() => updateProduct(product.id, 'stock', parseInt(editStock))}
                            className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
                          >
                            📦
                          </button>
                          <button
                            onClick={() => setEditingProduct(null)}
                            className="bg-gray-400 text-white px-2 py-1 rounded text-xs"
                          >
                            ❌
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingProduct(product.id);
                              setEditPrice(product.price.toString());
                              setEditStock(product.stock.toString());
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            ✏️ Modifier
                          </button>
                          <Link
  href={`/product/${product.id}`}
  className="text-green-600 hover:text-green-800 text-sm"
>
  👁️ Voir
</Link>
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            🗑️ Supprimer
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Aucun produit trouvé
        </div>
      )}
    </div>
  );
}