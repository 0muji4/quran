// Type guard for the Web type scale and window size classes (ADR 0032). If a
// change to the Panda config drops a name below, this file fails typecheck.
import { css } from '../styled-system/css';

css({ textStyle: 'bodyLarge' });
css({ textStyle: 'labelLarge' });
css({ textStyle: 'quran.ayah' });
css({ fontFamily: 'ui' });
css({ fontFamily: 'quran' });
css({ color: 'onSurface', backgroundColor: 'surface' });
css({ display: 'none', medium: { display: 'flex' }, expanded: { display: 'grid' } });

// @ts-expect-error — not a Material 3 type style
css({ textStyle: 'bodyHuge' });
