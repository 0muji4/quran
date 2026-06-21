import { Link } from '../../../../i18n/navigation';
import { css, cx } from '../../../../styled-system/css';
import { panel } from '../../../../styled-system/recipes';

// "Practice preferences" card on /profile.
//
// UI-only for now: the reciter / playback-speed / reminder values are
// placeholders and the controls are inert (disabled).
// TODO(profile-prefs): wire to a real preferences store and make the
//   rows interactive once the BFF exposes GET/PATCH /me/preferences.

const cardClass = css({
  padding: '6',
  display: 'flex',
  flexDirection: 'column',
  gap: '5'
});

const headRowClass = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: '4',
  flexWrap: 'wrap'
});

const cardTitleClass = css({ fontFamily: 'serif', fontSize: '[20px]', color: 'ink.strong' });

const historyLinkClass = css({
  fontSize: '[13px]',
  fontWeight: 600,
  color: 'green.deep',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '1'
});

const gridClass = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '5',
  '@media (max-width: 640px)': { gridTemplateColumns: '1fr' }
});

const rowClass = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '3'
});

const reminderRowClass = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '4',
  paddingBlockStart: '5',
  borderTopWidth: '1px',
  borderTopStyle: 'solid',
  borderTopColor: 'border'
});

const stackClass = css({ display: 'flex', flexDirection: 'column', gap: '1', minWidth: '[0]' });
const eyebrowClass = css({
  fontSize: '[11px]',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '[0.06em]',
  color: 'ink.muted'
});
const primaryClass = css({ fontSize: '[15px]', color: 'ink.strong' });
const helperClass = css({ fontSize: '[13px]', color: 'ink.muted' });
const chevronClass = css({ color: 'ink.muted', fontSize: '[18px]', flexShrink: 0 });

// Presentational "on" switch — green track, knob to the right.
const toggleClass = css({
  width: '[44px]',
  height: '[26px]',
  borderRadius: 'pill',
  backgroundColor: 'green',
  borderWidth: '[0]',
  position: 'relative',
  flexShrink: 0,
  cursor: 'not-allowed'
});
const toggleKnobClass = css({
  position: 'absolute',
  top: '[3px]',
  left: '[21px]',
  width: '[20px]',
  height: '[20px]',
  borderRadius: '[50%]',
  backgroundColor: 'bg.paper'
});

interface DisclosureRowProps {
  eyebrow: string;
  value: string;
  helper: string;
}

function DisclosureRow({ eyebrow, value, helper }: DisclosureRowProps) {
  return (
    <div className={rowClass}>
      <span className={stackClass}>
        <span className={eyebrowClass}>{eyebrow}</span>
        <span className={primaryClass}>{value}</span>
        <span className={helperClass}>{helper}</span>
      </span>
      <span className={chevronClass} aria-hidden="true">
        ›
      </span>
    </div>
  );
}

export function PracticePreferencesCard() {
  return (
    <section
      className={cx(panel({ surface: 'paper' }).root, cardClass)}
      aria-label="Practice preferences"
    >
      <div className={headRowClass}>
        <h2 className={cardTitleClass}>Practice preferences</h2>
        <Link href="/history" className={historyLinkClass}>
          View progress in History <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className={gridClass}>
        <DisclosureRow
          eyebrow="Reference reciter"
          value="Husary Mu'allim"
          helper="Slow teaching pace"
        />
        <DisclosureRow
          eyebrow="Default playback speed"
          value="1.00×"
          helper="Used when opening any ayah"
        />
      </div>

      <div className={reminderRowClass}>
        <span className={stackClass}>
          <span className={eyebrowClass}>Daily practice reminder</span>
          <span className={primaryClass}>On · 8:00 AM</span>
          <span className={helperClass}>One gentle nudge each morning</span>
        </span>
        <button
          type="button"
          className={toggleClass}
          role="switch"
          aria-checked="true"
          aria-label="Daily practice reminder"
          disabled
          title="Coming soon"
        >
          <span className={toggleKnobClass} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
