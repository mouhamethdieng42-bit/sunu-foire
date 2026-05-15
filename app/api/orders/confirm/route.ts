import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: { get() { return ''; }, set() {}, remove() {} },
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json({ error: 'orderId requis' }, { status: 400 });
    }

    // 1. Récupérer la commande avec les items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          quantity,
          unit_price,
          product:products (seller_id, name)
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
    }

    // 2. Vérifier l'éligibilité
    if (order.payment_method !== 'wallet' || order.payment_status !== 'held') {
      return NextResponse.json({ error: 'Commande non éligible (pas en séquestre)' }, { status: 400 });
    }
    if (order.status !== 'processing' && order.status !== 'shipped') {
      return NextResponse.json({ error: 'Commande non encore expédiée' }, { status: 400 });
    }

    // 3. Récupérer la transaction séquestre
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', order.buyer_id)
      .eq('type', 'payment')
      .eq('status', 'held')
      .ilike('reference', `ORDER_${order.id}%`)
      .single();

    if (txError || !transaction) {
      return NextResponse.json({ error: 'Transaction séquestre introuvable' }, { status: 404 });
    }

    // 4. Déterminer le vendeur (on suppose un seul vendeur par commande)
    const sellerId = order.order_items[0]?.product?.seller_id;
    if (!sellerId) {
      return NextResponse.json({ error: 'Vendeur introuvable' }, { status: 500 });
    }

    // 5. Commission
    const { data: commissionSetting } = await supabase
      .from('commission_settings')
      .select('value')
      .eq('key', 'default_commission_rate')
      .single();
    const commissionRate = parseFloat(commissionSetting?.value || '5') / 100;
    const commissionAmount = Math.floor(order.total_amount * commissionRate);
    const sellerAmount = order.total_amount - commissionAmount;

    // 6. Créditer le vendeur
    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', sellerId)
      .single();
    const newSellerBalance = (sellerProfile?.wallet_balance || 0) + sellerAmount;
    await supabase
      .from('profiles')
      .update({ wallet_balance: newSellerBalance })
      .eq('id', sellerId);

    // 7. Créer la transaction commission
    const commissionRef = `COMM_${order.id}_${Date.now()}`;
    await supabase.from('transactions').insert({
      user_id: sellerId,
      type: 'commission',
      amount: commissionAmount,
      status: 'completed',
      payment_method: 'wallet',
      reference: commissionRef,
      description: `Commission sur commande ${order.id}`,
    });

    // 8. Marquer la transaction séquestre comme complétée
    await supabase
      .from('transactions')
      .update({ status: 'completed' })
      .eq('id', transaction.id);

    // 9. Mettre à jour la commande
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'delivered', payment_status: 'completed' })
      .eq('id', order.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erreur API confirm:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}