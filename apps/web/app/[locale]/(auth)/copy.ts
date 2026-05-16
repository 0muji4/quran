// Per ADR 0023 Phase 2 the auth copy now lives in `messages/{en,ar}.json`
// under `auth.*` and is read via `useTranslations` / `getTranslations`.
// This module keeps only the mode discriminator + the level radio values,
// which remain code-side because they are form-state keys, not display copy.

export type AuthMode = 'signin' | 'signup';

export const LEVEL_VALUES = ['beginner', 'intermediate', 'advanced'] as const;
export type LevelValue = (typeof LEVEL_VALUES)[number];
