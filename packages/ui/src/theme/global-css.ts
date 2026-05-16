// Keyframes that need to outlive the CSS Modules they live in today.
//
// completionToastIn currently sits in apps/web/app/styles/library.module.css.
// PR 9c deletes that file once the library surfaces are migrated, so the
// animation has to be available globally before its only definition site
// goes away. Re-defining the same @keyframes name in both places is safe —
// CSS keyframe rules are global and the two definitions are identical.
//
// pulseDot / pulseRing / spin stay in practice.module.css; that file is
// intentionally never migrated (ADR 0022).
export const globalCss = {
  '@keyframes completionToastIn': {
    from: { opacity: 0, transform: 'translateY(8px)' },
    to: { opacity: 1, transform: 'translateY(0)' }
  }
};
