'use client';

import { useCart } from '@/context/CartContext';
import Link from 'next/link';

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalItems, totalPrice, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="p-4 md:p-8 text-center">
        <h1 className="text-xl md:text-2xl font-bold mb-4">Votre panier</h1>
        <p className="text-gray-500">Votre panier est vide.</p>
        <Link href="/products" className="text-green-600 mt-4 inline-block hover:underline">
          ← Retour au catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">
        Mon panier ({totalItems} article(s))
      </h1>

      {/* Version desktop (cachée sur mobile) */}
      <div className="hidden md:block space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex gap-4 border-b pb-4">
            {item.image_url && (
              <img 
                src={item.image_url} 
                alt={item.name} 
                className="w-20 h-20 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <h2 className="font-semibold">{item.name}</h2>
              <p className="text-green-600">{item.price.toLocaleString()} FCFA</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300"
              >
                -
              </button>
              <span className="w-8 text-center">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300"
              >
                +
              </button>
              <button
                onClick={() => removeItem(item.id)}
                className="ml-4 text-red-600 hover:text-red-800"
              >
                🗑️
              </button>
            </div>
            <div className="text-right min-w-[100px]">
              <p className="font-semibold">{(item.price * item.quantity).toLocaleString()} FCFA</p>
            </div>
          </div>
        ))}
      </div>

      {/* Version mobile (carte par carte) */}
      <div className="block md:hidden space-y-4">
        {items.map((item) => (
          <div key={item.id} className="border rounded-lg p-4">
            <div className="flex gap-3 mb-3">
              {item.image_url && (
                <img 
                  src={item.image_url} 
                  alt={item.name} 
                  className="w-16 h-16 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <h2 className="font-semibold text-base">{item.name}</h2>
                <p className="text-green-600 font-bold">{item.price.toLocaleString()} FCFA</p>
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="text-red-600 text-xl"
              >
                🗑️
              </button>
            </div>
            <div className="flex justify-between items-center border-t pt-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300 text-lg"
                >
                  -
                </button>
                <span className="w-8 text-center font-semibold">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300 text-lg"
                >
                  +
                </button>
              </div>
              <p className="font-bold text-lg">{(item.price * item.quantity).toLocaleString()} FCFA</p>
            </div>
          </div>
        ))}
      </div>

      {/* Total et actions (responsive) */}
      <div className="mt-6 pt-4 border-t">
        <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4">
          <div className="flex gap-4">
            <button onClick={clearCart} className="text-red-600 hover:underline text-sm md:text-base">
              Vider le panier
            </button>
            <Link href="/products" className="text-blue-600 hover:underline text-sm md:text-base">
              ← Ajouter des produits
            </Link>
          </div>
          <div className="text-right">
            <p className="text-lg md:text-xl font-bold">Total : {totalPrice.toLocaleString()} FCFA</p>
            <Link 
              href="/checkout" 
              className="inline-block bg-green-600 text-white px-4 md:px-6 py-2 rounded hover:bg-green-700 mt-2 text-sm md:text-base"
            >
              Commander →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}