interface EmailParams {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
}

export async function sendEmail({ to, toName, subject, htmlContent }: EmailParams) {
  console.log(`📧 Tentative d'envoi d'email à ${to}`);
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('❌ BREVO_API_KEY manquante dans .env.local');
    return false;
  }
  console.log('🔑 Clé API présente (longueur:', apiKey.length, ')');

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { email: 'mouhameth425@gmail.com', name: 'SUNU FOIRE' },
      to: [{ email: to, name: toName || to.split('@')[0] }],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Erreur Brevo (${response.status}):`, errorText);
    return false;
  }

  console.log('✅ Email envoyé avec succès');
  return true;
}

export function getBaseTemplate(content: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>SUNU FOIRE</title></head>
    <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="background: #166534; padding: 20px; text-align: center; color: white;">
          <h1 style="margin: 0;">🌾 SUNU FOIRE</h1>
        </div>
        <div style="padding: 20px;">
          ${content}
        </div>
        <div style="background: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          &copy; ${new Date().getFullYear()} SUNU FOIRE - Tous droits réservés.
        </div>
      </div>
    </body>
    </html>
  `;
}