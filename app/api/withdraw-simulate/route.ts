import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: Request) {
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { amount, paymentMethod = 'wave' } = await request.json();
    if (!amount || amount < 500) {
      return NextResponse.json({ error: 'Montant minimum 500 FCFA' }, { status: 400 });
    }

    // Vérifier le solde
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();
    if (fetchError) throw fetchError;
    if ((profile?.wallet_balance || 0) < amount) {
      return NextResponse.json({ error: 'Solde insuffisant' }, { status: 400 });
    }

    const reference = `WITHDRAW_${Date.now()}_${user.id.slice(0, 6)}`;

    // Créer la transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'withdrawal',
        amount,
        status: 'pending',
        payment_method: paymentMethod,
        reference,
        description: 'Retrait simulé (en attente)',
      });
    if (txError) throw txError;

    // Débiter le solde
    const newBalance = (profile?.wallet_balance || 0) - amount;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', user.id);
    if (updateError) throw updateError;

    // Simuler la validation du retrait (passer à 'completed')
    await supabase
      .from('transactions')
      .update({ status: 'completed' })
      .eq('reference', reference);

    return NextResponse.json({ success: true, newBalance, reference });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}