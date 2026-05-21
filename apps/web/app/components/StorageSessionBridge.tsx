'use client';

import { setSignedInGate } from '../lib/storage';

interface Props {
  signedIn: boolean;
}

/**
 * Pushes the server-rendered session state into the module-level
 * gate inside `storage.ts`, synchronously during render so the first
 * paint of any storage-reading component below it sees the correct
 * value. `useEffect` would defer this to after paint and flicker a
 * frame of "anonymous" UI for signed-in users.
 *
 * Strict-mode double-render is idempotent here — setting a boolean
 * twice to the same value has the same effect as once.
 */
export function StorageSessionBridge({ signedIn }: Props) {
  setSignedInGate(signedIn);
  return null;
}
