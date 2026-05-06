import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    // Créer un client Supabase avec le token pour authentifier toutes les requêtes
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return ''; },
          set() {},
          remove() {},
        },
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );

    // Vérifier que le token est valide et récupérer l'utilisateur
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { amount } = await request.json();
    if (!amount || amount < 500) {
      return NextResponse.json({ error: 'Montant minimum 500 FCFA' }, { status: 400 });
    }

    const reference = `TEST_DEP_${Date.now()}_${user.id.slice(0, 6)}`;

    // Insertion de la transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'deposit',
        amount,
        status: 'completed',
        payment_method: 'simulation',
        reference,
        description: 'Dépôt de test (simulation)',
      });

    if (txError) throw txError;

    // Récupération du solde
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();
    if (fetchError) throw fetchError;

    const newBalance = (profile?.wallet_balance || 0) + amount;

    // Mise à jour du solde
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', user.id);
    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      newBalance,
      transaction: { reference, amount }
    });
  } catch (error: any) {
    console.error('Erreur API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}