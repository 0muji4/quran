// Type guard for the recipes of ADR 0032. If a recipe or a variant below
// drops out of the Panda config, this file fails typecheck.
import {
  appButton,
  appCard,
  appChip,
  appFab,
  appIconButton,
  appListItem,
  appProgress,
  appSelect
} from '../styled-system/recipes';

appButton({ variant: 'filled' });
appButton({ variant: 'tonal' });
appButton({ variant: 'outlined' });
appButton({ variant: 'text' });
appButton({ variant: 'error' });
appIconButton({ variant: 'standard' });
appIconButton({ variant: 'tonal' });
appFab({ tone: 'primary' });
appFab({ tone: 'error' });
appCard({ variant: 'elevated' });
appCard({ variant: 'filled' });
appCard({ variant: 'outlined' });
appChip();
appListItem();
appSelect();
appProgress();

// @ts-expect-error — not a Material 3 button variant
appButton({ variant: 'gold' });
