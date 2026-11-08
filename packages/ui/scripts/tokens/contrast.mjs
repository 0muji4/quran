// Validation: checks the text/background role pairs against WCAG AA.
// Pure functions; no I/O.

import { Contrast, Hct, argbFromHex } from '@material/material-color-utilities';

import { CONTRAST_PAIRS } from './roles.mjs';

export const MIN_CONTRAST = 4.5;

const toneOf = (hex) => Hct.fromInt(argbFromHex(hex)).tone;

/** Returns a message for each pair below MIN_CONTRAST, given role → hex. */
export function findContrastFailures(mode, hexByRole) {
  const failures = [];
  for (const [text, background] of CONTRAST_PAIRS) {
    const ratio = Contrast.ratioOfTones(toneOf(hexByRole[text]), toneOf(hexByRole[background]));
    if (ratio < MIN_CONTRAST) {
      failures.push(`${mode}: ${text} on ${background} is ${ratio.toFixed(2)}:1`);
    }
  }
  return failures;
}
