import { supabase } from './supabase';

export async function sendOrderStatusNotification(
  userId: string,
  orderId: string,
  status: string
) {
  // Messages selon le statut
  const messages: Record<string, { title: string; message: string }> = {
    processing: {
      title: '🟡 Commande en préparation',
      message: 'Votre commande est en cours de préparation. Nous vous tiendrons informé dès son expédition.'
    },
    shipped: {
      title: '📦 Commande expédiée',
      message: 'Votre commande a été expédiée ! Vous pourrez bientôt la recevoir.'
    },
    delivered: {
      title: '🎉 Commande livrée',
      message: 'Votre commande a été livrée avec succès. Merci de votre confiance !'
    },
    cancelled: {
      title: '❌ Commande annulée',
      message: 'Votre commande a été annulée. Contactez le service client pour plus d\'informations.'
    }
  };

  const notification = messages[status];
  if (!notification) return;

  // Insérer la notification dans la base de données
  await supabase.from('notifications').insert({
    user_id: userId,
    order_id: orderId,
    title: notification.title,
    message: notification.message,
    type: 'order_status'
  });
}