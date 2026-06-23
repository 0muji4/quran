'use client';

import { useEffect, useRef, useTransition } from 'react';
import { GoogleIcon } from './icons/GoogleIcon';
import { signInWithGoogleAction, type SignInWithGoogleResult } from '../../actions';

interface CodeResponse {
  code?: string;
}

interface CodeClient {
  requestCode(): void;
}

interface GoogleOAuth2 {
  initCodeClient(config: {
    client_id: string;
    scope: string;
    ux_mode: 'popup';
    callback: (response: CodeResponse) => void;
  }): CodeClient;
}

declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleOAuth2 } };
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
  // The shared OAuth button style, so Google matches the Apple button.
  className: string;
  onResult: (result: SignInWithGoogleResult) => void;
  onError: () => void;
}

// A custom-styled Google button (matching the Apple button) that drives the
// OAuth auth-code popup flow: the browser gets an auth code, the BFF
// exchanges it for a verified identity. Using initCodeClient (rather than
// the GIS-rendered ID-token button) is what lets us own the button markup.
export function GoogleSignInButton({ clientId, label, className, onResult, onError }: Props) {
  const clientRef = useRef<CodeClient | null>(null);
  const [pending, startTransition] = useTransition();
  // Held in refs so the init effect runs once on mount rather than
  // re-initialising whenever a parent callback changes.
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  onResultRef.current = onResult;
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    loadGis()
      .then(() => {
        if (cancelled || !window.google) return;
        clientRef.current = window.google.accounts.oauth2.initCodeClient({
          client_id: clientId,
          scope: 'openid email profile',
          ux_mode: 'popup',
          callback: (response) => {
            const code = response.code;
            if (!code) {
              onErrorRef.current();
              return;
            }
            startTransition(async () => {
              try {
                onResultRef.current(await signInWithGoogleAction({ code }));
              } catch {
                onErrorRef.current();
              }
            });
          }
        });
      })
      .catch(() => onErrorRef.current());
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const handleClick = (): void => {
    if (clientRef.current) clientRef.current.requestCode();
    else onErrorRef.current();
  };

  return (
    <button type="button" className={className} onClick={handleClick} disabled={pending}>
      <GoogleIcon />
      <span>{label}</span>
    </button>
  );
}
