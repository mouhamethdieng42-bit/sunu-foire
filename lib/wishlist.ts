import { supabase } from './supabase';

// Vérifier si un produit est dans les favoris
export async function isInWishlist(productId: string, userId: string) {
  const { data } = await supabase
    .from('wishlist')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .single();
  
  return !!data;
}

// Ajouter aux favoris
export async function addToWishlist(productId: string, userId: string) {
  const { error } = await supabase.from('wishlist').insert({
    user_id: userId,
    product_id: productId,
  });
  return !error;
}

// Retirer des favoris
export async function removeFromWishlist(productId: string, userId: string) {
  const { error } = await supabase
    .from('wishlist')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);
  return !error;
}

// Compter les favoris
export async function countWishlist(userId: string) {
  const { count } = await supabase
    .from('wishlist')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count || 0;
}