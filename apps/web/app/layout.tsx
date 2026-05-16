import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import localFont from 'next/font/local';
import { WebTelemetryInit } from './telemetry/WebTelemetryInit';
// Panda's emitted stylesheet has to be imported before globals.css so
// the legacy :root vars in globals.css win on shared properties during
// the migration. Removed in PR 11 once globals.css's token block is gone.
import '../styled-system/styles.css';
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

// Root layout is intentionally thin: <html>/<body>, fonts, telemetry. The
// persistent chrome (AppShell + session) lives in the (app) route group so
// the (auth) group can render full-bleed without it.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable} ${amiri.variable}`}>
      <body suppressHydrationWarning>
        <WebTelemetryInit />
        {children}
      </body>
    </html>
  );
}
