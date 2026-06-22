// Practice preferences shared between the server actions and the client card.
// Lives outside actions.ts because that file is "use server", which may only
// export async functions — a const/interface export breaks the Next build.
// Mirrors the BFF type in apps/bff/src/me/preferences.ts.
export interface PracticePreferences {
  referenceReciterId: string;
  defaultPlaybackSpeed: number;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // "HH:mm" (24h)
}

// Returned when the BFF read fails so the card always renders
// (cf. fetchCurrentUserProfile returning null).
export const DEFAULT_PRACTICE_PREFERENCES: PracticePreferences = {
  referenceReciterId: 'husary-muallim',
  defaultPlaybackSpeed: 1,
  dailyReminderEnabled: false,
  dailyReminderTime: '08:00'
};
