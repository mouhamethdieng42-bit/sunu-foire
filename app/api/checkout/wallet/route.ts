import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    // Créer un client Supabase avec le token dans les headers
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get() { return ''; },
          set() {},
          remove() {},
        },
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { buyer_id, total_amount, delivery_address, phone, payment_method, items } = await request.json();
    if (!buyer_id || !items || items.length === 0) {
      return NextResponse.json({ error: 'Données incomplètes' }, { status: 400 });
    }

    // Vérifier le solde si paiement portefeuille
    if (payment_method === 'wallet') {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', buyer_id)
        .single();
      if (profileError) throw profileError;
      if ((profile?.wallet_balance || 0) < total_amount) {
        return NextResponse.json({ error: 'Solde insuffisant' }, { status: 400 });
      }
    }

    // 1. Créer la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id,
        total_amount,
        delivery_address,
        phone,
        payment_method,
        status: 'pending',
        payment_status: payment_method === 'wallet' ? 'held' : 'pending',
      })
      .select()
      .single();
    if (orderError) throw orderError;

    // 2. Ajouter les articles
    for (const item of items) {
      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        });
      if (itemError) throw itemError;
    }

    // 3. Gérer le paiement portefeuille (séquestre)
    if (payment_method === 'wallet') {
      const reference = `ORDER_${order.id}_${Date.now()}`;
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: buyer_id,
          type: 'payment',
          amount: total_amount,
          status: 'held',
          payment_method: 'wallet',
          reference,
          description: `Paiement commande ${order.id} (séquestre) - En attente de livraison`,
        });
      if (txError) throw txError;

      // Débiter le portefeuille
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', buyer_id)
        .single();
      const newBalance = (profile?.wallet_balance || 0) - total_amount;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', buyer_id);
      if (updateError) throw updateError;

      await supabase
        .from('orders')
        .update({ status: 'processing', payment_status: 'held' })
        .eq('id', order.id);
    } else {
      await supabase
        .from('orders')
        .update({ status: 'processing', payment_status: 'paid' })
        .eq('id', order.id);
    }

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}