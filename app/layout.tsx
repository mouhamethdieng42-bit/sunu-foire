import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import Navigation from '@/components/Navigation';
import InstallButton from '@/components/InstallButton';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SUNU FOIRE',
  description: 'Marketplace des producteurs locaux',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <CartProvider>
          <Navigation />
          <main>{children}</main>
          <InstallButton />
        </CartProvider>
      </body>
    </html>
  );
}