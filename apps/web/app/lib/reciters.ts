// Reciter catalogue for the Profile preferences card — interim home until a
// reciters API exists (Issue #476). The id set mirrors the BFF enum in
// apps/bff/src/me/preferences.ts; keep them in sync.

export interface ReciterOption {
  id: string;
  label: string;
  helper: string;
}

export const RECITERS: readonly ReciterOption[] = [
  { id: 'husary-muallim', label: "Husary Mu'allim", helper: 'Slow teaching pace' }
];

export const reciterLabel = (id: string): string =>
  RECITERS.find((reciter) => reciter.id === id)?.label ?? id;

export const reciterHelper = (id: string): string =>
  RECITERS.find((reciter) => reciter.id === id)?.helper ?? '';
