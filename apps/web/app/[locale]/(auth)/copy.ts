// Shared copy for the sign-in / sign-up screens. Kept out of the
// components so AuthScreen (server) and AuthForm (client) read the same
// strings without duplicating them.

export type AuthMode = 'signin' | 'signup';

type ModeCopy = {
  eyebrow: string;
  title: string;
  lede: string;
  submit: string;
  submitPending: string;
};

export const AUTH_COPY: Record<AuthMode, ModeCopy> = {
  signin: {
    eyebrow: 'Welcome back',
    title: 'Sign in to continue your practice',
    lede: 'Your attempts and progress are saved across every device you sign in to.',
    submit: 'Sign in',
    submitPending: 'Signing in…'
  },
  signup: {
    eyebrow: 'Begin your journey',
    title: 'Create your Tilawah account',
    lede: 'Practise daily, track every attempt, and watch your recitation grow.',
    submit: 'Create account',
    submitPending: 'Creating account…'
  }
};

// Left brand panel. The ayah is Al-Muzzammil 73:4 — "And recite the
// Qur'an with measured recitation" — the verse the practice app is named
// after (tilāwah / tartīl).
export const BRAND_COPY = {
  wordmark: 'Tilawah',
  kicker: 'Recitation Practice',
  ayah: 'وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا',
  ayahTranslation: 'And recite the Qur’an with measured recitation.',
  ayahCitation: 'Al-Muzzammil · 73:4'
} as const;

// Sign-up level selector. UI-only this pass — the chosen value is not yet
// sent to the BFF (see plan: persistence lands with a later DesignDoc).
export const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Beginner', description: 'Learning Arabic' },
  { value: 'intermediate', label: 'Intermediate', description: 'Working on tajweed' },
  { value: 'advanced', label: 'Advanced', description: 'Polishing recitation' }
] as const;

export type LevelValue = (typeof LEVEL_OPTIONS)[number]['value'];
