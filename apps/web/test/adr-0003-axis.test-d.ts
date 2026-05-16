// ADR 0003 guard. The gold token is intentionally split into
// surface/onLight/onDark with no DEFAULT. strictTokens + the lack of
// `gold.DEFAULT` should make `color: 'gold'` (no axis) a TS error.
// If a future Panda upgrade relaxes that, this file fails typecheck
// and we catch the regression in CI.
import { css } from '../styled-system/css';

// Axes that ARE allowed:
css({ color: 'gold.surface' });
css({ color: 'gold.onLight' });
css({ color: 'gold.onDark' });
css({ backgroundColor: 'gold.surface' });

// Axis-less reference must be rejected:
// @ts-expect-error — ADR 0003: gold token has no DEFAULT axis
css({ color: 'gold' });

// A made-up axis must also be rejected:
// @ts-expect-error — ADR 0003: only surface/onLight/onDark are defined
css({ color: 'gold.bogus' });
