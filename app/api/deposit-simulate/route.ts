import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { sendEmail, getBaseTemplate } from '@/lib/brevo';

export async function POST(request: Request) {
  console.log('=== API deposit-simulate appelée ===');
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      console.error('Token manquant');
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
      console.error('Utilisateur non authentifié', userError);
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.log('Utilisateur connecté:', user.id, user.email);

    const { amount } = await request.json();
    if (!amount || amount < 500) {
      return NextResponse.json({ error: 'Montant minimum 500 FCFA' }, { status: 400 });
    }

    const reference = `TEST_DEP_${Date.now()}_${user.id.slice(0, 6)}`;

    // 1. Créer transaction
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

    // 2. Récupérer solde et mettre à jour
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();
    if (fetchError) throw fetchError;
    const newBalance = (profile?.wallet_balance || 0) + amount;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', user.id);
    if (updateError) throw updateError;

    // 3. Envoyer email
    if (user.email) {
      console.log('Envoi email à', user.email);
      const emailSent = await sendEmail({
        to: user.email,
        subject: 'Dépôt effectué sur votre portefeuille',
        htmlContent: getBaseTemplate(`
          <h2>Dépôt confirmé</h2>
          <p>Bonjour,</p>
          <p>Un dépôt de <strong>${amount.toLocaleString()} FCFA</strong> a été ajouté à votre portefeuille.</p>
          <p>Nouveau solde : <strong>${newBalance.toLocaleString()} FCFA</strong></p>
          <p>Merci d'utiliser SUNU FOIRE.</p>
        `),
      });
      console.log('Résultat envoi email:', emailSent);
    } else {
      console.error('Email utilisateur manquant, impossible d\'envoyer');
    }

    return NextResponse.json({ success: true, newBalance, transaction: { reference, amount } });
  } catch (error: any) {
    console.error('Erreur API deposit-simulate:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}