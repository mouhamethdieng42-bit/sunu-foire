import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { sendEmail, getBaseTemplate } from '@/lib/brevo';

export async function POST(request: Request) {
  console.error('🔥 API deposit-simulate appelée');
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

    const { amount } = await request.json();

    // Récupérer le montant minimum de dépôt depuis les paramètres
    const { data: minDepositSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'min_deposit_amount')
      .single();

    const minDeposit = parseInt(minDepositSetting?.value || '500');

    // LOGS DE DÉBOGAGE (à vérifier dans le terminal)
    console.log('minDepositSetting:', minDepositSetting);
    console.log('minDeposit valeur:', minDeposit);
    console.log('amount reçu:', amount);

    if (!amount || amount < minDeposit) {
      return NextResponse.json({ error: `Montant minimum de dépôt : ${minDeposit} FCFA` }, { status: 400 });
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

    // 2. Récupérer solde
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
      await sendEmail({
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
    }

    return NextResponse.json({ success: true, newBalance, transaction: { reference, amount } });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}