import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { sendEmail, getBaseTemplate } from '@/lib/brevo';

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { amount, paymentMethod = 'wave' } = await request.json();

    // Récupérer le montant minimum de retrait depuis les paramètres
    const { data: minWithdrawalSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'min_withdrawal_amount')
      .single();
    const minWithdrawal = parseInt(minWithdrawalSetting?.value || '1000');

    if (!amount || amount < minWithdrawal) {
      return NextResponse.json({ error: `Montant minimum de retrait : ${minWithdrawal} FCFA` }, { status: 400 });
    }

    // Vérifier solde
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

    // Créer transaction
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'withdrawal',
      amount,
      status: 'pending',
      payment_method: paymentMethod,
      reference,
      description: 'Retrait simulé (en attente)',
    });

    // Débiter le solde
    const newBalance = (profile?.wallet_balance || 0) - amount;
    await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', user.id);

    // Simuler validation
    await supabase
      .from('transactions')
      .update({ status: 'completed' })
      .eq('reference', reference);

    // Envoyer email
    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: 'Retrait effectué depuis votre portefeuille',
        htmlContent: getBaseTemplate(`
          <h2>Retrait enregistré</h2>
          <p>Bonjour,</p>
          <p>Un retrait de <strong>${amount.toLocaleString()} FCFA</strong> a été effectué via ${paymentMethod}.</p>
          <p>Nouveau solde : <strong>${newBalance.toLocaleString()} FCFA</strong></p>
          <p>Merci de votre confiance.</p>
        `),
      });
    }

    return NextResponse.json({ success: true, newBalance, reference });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}