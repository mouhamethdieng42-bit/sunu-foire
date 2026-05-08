import { supabase } from '@/lib/supabase';
import { sendEmail, getBaseTemplate } from '@/lib/brevo';

export async function sendOrderStatusNotification(buyerId: string, orderId: string, newStatus: string) {
  try {
    // Récupérer les infos du client
    const { data: buyer, error: buyerError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', buyerId)
      .single();
    if (buyerError || !buyer?.email) {
      console.error('Impossible de récupérer l\'email du client', buyerError);
      return false;
    }

    // Récupérer les détails de la commande
    const { data: order } = await supabase
      .from('orders')
      .select('total_amount, created_at')
      .eq('id', orderId)
      .single();

    let subject = '';
    let content = '';

    switch (newStatus) {
      case 'processing':
        subject = `Votre commande #${orderId.slice(0, 8)} est en préparation`;
        content = `
          <h2>Commande en préparation</h2>
          <p>Bonjour ${buyer.full_name || 'cher client'},</p>
          <p>Votre commande <strong>#${orderId.slice(0, 8)}</strong> est en cours de préparation.</p>
          <p>Nous vous tiendrons informé dès son expédition.</p>
        `;
        break;
      case 'shipped':
        subject = `Votre commande #${orderId.slice(0, 8)} a été expédiée`;
        content = `
          <h2>Commande expédiée</h2>
          <p>Bonjour ${buyer.full_name || 'cher client'},</p>
          <p>Votre commande <strong>#${orderId.slice(0, 8)}</strong> est en route !</p>
          <p>Vous pourrez bientôt la recevoir.</p>
        `;
        break;
      case 'delivered':
        subject = `Votre commande #${orderId.slice(0, 8)} est livrée`;
        content = `
          <h2>Commande livrée</h2>
          <p>Bonjour ${buyer.full_name || 'cher client'},</p>
          <p>Votre commande <strong>#${orderId.slice(0, 8)}</strong> a été livrée avec succès.</p>
          <p>Merci d'avoir acheté sur SUNU FOIRE !</p>
        `;
        break;
      case 'cancelled':
        subject = `Votre commande #${orderId.slice(0, 8)} a été annulée`;
        content = `
          <h2>Commande annulée</h2>
          <p>Bonjour ${buyer.full_name || 'cher client'},</p>
          <p>Votre commande <strong>#${orderId.slice(0, 8)}</strong> a été annulée.</p>
          <p>Si vous avez des questions, contactez notre service client.</p>
        `;
        break;
      default:
        return false; // Ne pas envoyer pour 'pending' ou autre
    }

    // Ajouter le montant si disponible
    if (order?.total_amount) {
      content += `<p><strong>Montant :</strong> ${order.total_amount.toLocaleString()} FCFA</p>`;
    }

    const success = await sendEmail({
      to: buyer.email,
      subject,
      htmlContent: getBaseTemplate(content),
    });

    return success;
  } catch (error) {
    console.error('Erreur envoi notification statut:', error);
    return false;
  }
}