import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Clé API manquante' }, { status: 500 });
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { email: 'mouhameth425@gmail.com', name: 'SUNU FOIRE' },
      to: [{ email: 'mouhameth425@gmail.com', name: 'Test' }],
      subject: 'Test direct depuis API',
      htmlContent: '<p>Ceci est un test.</p>',
    }),
  });

  const text = await response.text();
  return NextResponse.json({ status: response.status, body: text });
}