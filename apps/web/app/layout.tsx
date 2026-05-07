import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Amiri, Cormorant_Garamond, Inter } from 'next/font/google';
import { AppShell } from './components/AppShell';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap'
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
});

const amiri = Amiri({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-amiri',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Tilawah · Recitation Practice',
  description:
    'Listen to a teacher recite, then practice your own tilawah and get scored against the reference.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable} ${amiri.variable}`}>
      <body suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
