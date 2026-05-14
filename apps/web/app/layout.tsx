import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import localFont from 'next/font/local';
import { AppShell } from './components/AppShell';
import { getCurrentSession } from './lib/session';
import { WebTelemetryInit } from './telemetry/WebTelemetryInit';
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

// Phase 4.3-D / ADR 0020. Amiri Regular + Bold pre-subsetted to the
// Quran corpus (91 unique codepoints from db/seed_quran.sql + a UI
// allow-list) and renamed per OFL §"Reserved Font Name". Halves the
// Arabic font payload vs the previous next/font/google Amiri.
const amiri = localFont({
  src: [
    { path: './fonts/amiri-quran-subset-regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/amiri-quran-subset-bold.woff2', weight: '700', style: 'normal' }
  ],
  variable: '--font-amiri',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Tilawah · Recitation Practice',
  description:
    'Listen to a teacher recite, then practice your own tilawah and get scored against the reference.'
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable} ${amiri.variable}`}>
      <body suppressHydrationWarning>
        <WebTelemetryInit />
        <AppShell session={session}>{children}</AppShell>
      </body>
    </html>
  );
}
