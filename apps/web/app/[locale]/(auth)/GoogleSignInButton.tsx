'use client';

import { useEffect, useRef, useTransition } from 'react';
import { signInWithGoogleAction, type SignInWithGoogleResult } from '../../actions';

interface CredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize(config: { client_id: string; callback: (response: CredentialResponse) => void }): void;
  renderButton(
    parent: HTMLElement,
    config: { type: 'standard'; theme: string; size: string; text: string; shape: string }
  ): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';

// Single shared load across button instances (sign-in and sign-up both
// mount one).
let gisScriptPromise: Promise<void> | null = null;

const loadGis = (): Promise<void> => {
  if (gisScriptPromise) return gisScriptPromise;
  gisScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
  return gisScriptPromise;
};

interface Props {
  clientId: string;
  label: string;
  onResult: (result: SignInWithGoogleResult) => void;
  onError: () => void;
}

// Renders Google's official Sign-In button via Google Identity Services
// and forwards the resulting ID token to the BFF through the server
// action. The official button is used (rather than the styled fallback)
// because GIS owns the credential popup.
export function GoogleSignInButton({ clientId, label, onResult, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();
  // Held in refs so the init effect runs once on mount rather than
  // re-rendering the GIS button whenever a parent callback changes.
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  onResultRef.current = onResult;
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    loadGis()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            if (!credential) {
              onErrorRef.current();
              return;
            }
            startTransition(async () => {
              try {
                onResultRef.current(await signInWithGoogleAction({ idToken: credential }));
              } catch {
                onErrorRef.current();
              }
            });
          }
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill'
        });
      })
      .catch(() => onErrorRef.current());
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return <div ref={containerRef} aria-label={label} />;
}
