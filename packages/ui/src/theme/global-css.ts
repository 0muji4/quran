// Keyframes, which Panda's recipes and css() refer to by name.
export const globalCss = {
  // The circular progress indicator of the Web redesign (ADR 0032).
  '@keyframes appSpin': {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' }
  },
  // The toast rising into place.
  '@keyframes completionToastIn': {
    from: { opacity: 0, transform: 'translateY(8px)' },
    to: { opacity: 1, transform: 'translateY(0)' }
  }
};
