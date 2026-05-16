import { defineRecipe } from '@pandacss/dev';

// Per-attempt status indicator on the history list. Replaces the
// .statusPill / .statusPillCompleted / .statusPillFailed trio.
//
// Off-grid metrics ([32px], [10px], [4px], [12px]) use Panda's bracket
// escape so the migrated history rows match the legacy CSS exactly.
// The failed variant pairs `color.red` text with a bracket-escaped
// rgba tint that has no equivalent token yet.
export const statusPill = defineRecipe({
  className: 'statusPill',
  description: 'Per-attempt status badge on the history list.',
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '[32px]',
    paddingInline: '[10px]',
    paddingBlock: '[4px]',
    borderRadius: 'pill',
    fontSize: '[12px]',
    fontWeight: 600
  },
  variants: {
    tone: {
      completed: {
        backgroundColor: 'mint.bg',
        color: 'mint.ink'
      },
      failed: {
        backgroundColor: '[rgba(192, 57, 43, 0.1)]',
        color: 'red'
      }
    }
  }
});
