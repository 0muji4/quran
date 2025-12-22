import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Quran Project Recorder',
  description: 'Record your recitation and request a scoring job.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="page-shell">
          <header className="page-header">
            <div className="brand">
              <span aria-hidden="true">📖</span>
              <div>
                <p className="brand-title">Quran Project</p>
                <p className="brand-subtitle">Recorder</p>
              </div>
            </div>
          </header>
          <main className="page-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
