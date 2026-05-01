'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
};

type CartContextType = {
  items: CartItem[];
  addItem: (product: any) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('cart');
    if (saved) setItems(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = async (product: any) => {
    console.log('🔵 addItem appelé pour produit:', product.id);
    
    // 1. Récupérer le stock actuel
    const { data: currentProduct, error: fetchError } = await supabase
      .from('products')
      .select('stock')
      .eq('id', product.id)
      .single();

    if (fetchError) {
      console.error('❌ Erreur récupération stock:', fetchError);
      alert('Erreur: ' + fetchError.message);
      return;
    }

    console.log('📦 Stock actuel en base:', currentProduct?.stock);

    if (!currentProduct || currentProduct.stock <= 0) {
      alert('Stock insuffisant !');
      return;
    }

    // 2. Diminuer le stock de 1
    const newStock = currentProduct.stock - 1;
    console.log('🔄 Nouveau stock à enregistrer:', newStock);

    const { error: updateError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', product.id);

    if (updateError) {
      console.error('❌ Erreur mise à jour stock:', updateError);
      alert('Erreur: ' + updateError.message);
      return;
    }

    // 3. Vérifier que la mise à jour a bien fonctionné
    const { data: verifyProduct } = await supabase
      .from('products')
      .select('stock')
      .eq('id', product.id)
      .single();

    console.log('✅ Vérification stock après update:', verifyProduct?.stock);

    // 4. Ajouter au panier
    setItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image_url: product.image_urls?.[0]
      }];
    });
  };

  const removeItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (item) {
      // Récupérer le stock actuel
      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', id)
        .single();

      if (product) {
        // Restaurer le stock
        const newStock = (product.stock || 0) + item.quantity;
        console.log('🔄 Restauration stock:', newStock);
        await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', id);
      }
    }
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = async (id: string, quantity: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const quantityDiff = quantity - item.quantity;

    if (quantityDiff > 0) {
      // Augmenter la quantité : vérifier le stock
      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', id)
        .single();

      if (product && product.stock < quantityDiff) {
        alert('Stock insuffisant !');
        return;
      }

      if (product) {
        const newStock = (product.stock || 0) - quantityDiff;
        await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', id);
      }
    } else if (quantityDiff < 0) {
      // Diminuer la quantité : restaurer le stock
      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', id)
        .single();

      if (product) {
        const newStock = (product.stock || 0) - quantityDiff;
        await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', id);
      }
    }

    if (quantity <= 0) {
      await removeItem(id);
      return;
    }

    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, quantity } : item
    ));
  };

  const clearCart = async () => {
    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.id)
        .single();

      if (product) {
        const newStock = (product.stock || 0) + item.quantity;
        await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.id);
      }
    }
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, clearCart,
      totalItems, totalPrice
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}