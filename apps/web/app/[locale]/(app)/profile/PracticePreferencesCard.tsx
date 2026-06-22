'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '../../../../i18n/navigation';
import { updatePreferencesAction } from '../../../actions';
import type { PracticePreferences } from '../../../lib/preferences';
import { RECITERS, reciterHelper } from '../../../lib/reciters';
import { css, cx } from '../../../../styled-system/css';
import { panel } from '../../../../styled-system/recipes';

interface Props {
  preferences: PracticePreferences;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const formatSpeed = (speed: number): string => `${speed.toFixed(2)}×`;

const cardClass = css({ padding: '6', display: 'flex', flexDirection: 'column', gap: '5' });

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

const fieldClass = css({ display: 'flex', flexDirection: 'column', gap: '2', minWidth: '[0]' });

const eyebrowClass = css({
  fontSize: '[11px]',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '[0.06em]',
  color: 'ink.muted'
});

const helperClass = css({ fontSize: '[13px]', color: 'ink.muted' });
const primaryClass = css({ fontSize: '[15px]', color: 'ink.strong' });

const selectClass = css({
  font: '[inherit]',
  fontSize: '[15px]',
  paddingBlock: '2',
  paddingInline: '3',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  borderRadius: 'md',
  backgroundColor: 'bg.paper',
  color: 'ink.strong',
  minHeight: '[44px]',
  cursor: 'pointer',
  '&:focus-visible': { outlineColor: 'green' },
  _disabled: { opacity: 0.6, cursor: 'progress' }
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

const toggleClass = css({
  width: '[44px]',
  height: '[26px]',
  borderRadius: 'pill',
  borderWidth: '[0]',
  position: 'relative',
  flexShrink: 0,
  cursor: 'pointer',
  transition: '[background-color 0.15s ease]',
  _disabled: { opacity: 0.6, cursor: 'progress' }
});
const toggleOnClass = css({ backgroundColor: 'green' });
const toggleOffClass = css({ backgroundColor: 'ink.muted' });

const knobClass = css({
  position: 'absolute',
  top: '[3px]',
  width: '[20px]',
  height: '[20px]',
  borderRadius: '[50%]',
  backgroundColor: 'bg.paper',
  transition: '[left 0.15s ease]'
});
const knobOnClass = css({ left: '[21px]' });
const knobOffClass = css({ left: '[3px]' });

const timeRowClass = css({ display: 'flex', alignItems: 'center', gap: '3', flexWrap: 'wrap' });

const timeInputClass = css({
  font: '[inherit]',
  fontSize: '[15px]',
  paddingBlock: '2',
  paddingInline: '3',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  borderRadius: 'md',
  backgroundColor: 'bg.paper',
  color: 'ink.strong',
  minHeight: '[44px]',
  '&:focus-visible': { outlineColor: 'green' },
  _disabled: { opacity: 0.6, cursor: 'progress' }
});

const errorClass = css({
  backgroundColor: '[rgba(192, 57, 43, 0.08)]',
  color: 'red',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: '[rgba(192, 57, 43, 0.25)]',
  borderRadius: 'md',
  paddingBlock: '2',
  paddingInline: '3',
  fontSize: '[13px]'
});

export function PracticePreferencesCard({ preferences }: Props) {
  const t = useTranslations('profile.preferences');
  const [prefs, setPrefs] = useState(preferences);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Optimistic write: show the change immediately, persist it, and on
  // failure roll back to the snapshot so the UI never lies about what is
  // stored. The action returns the canonical row, so success overwrites the
  // optimistic guess with the server's view.
  const save = (patch: Partial<PracticePreferences>): void => {
    const previous = prefs;
    setPrefs((current) => ({ ...current, ...patch }));
    setError(null);
    startTransition(async () => {
      try {
        setPrefs(await updatePreferencesAction(patch));
      } catch {
        setPrefs(previous);
        setError(t('saveError'));
      }
    });
  };

  const speedOptions = Array.from(new Set([...SPEED_OPTIONS, prefs.defaultPlaybackSpeed])).sort(
    (a, b) => a - b
  );

  return (
    <section className={cx(panel({ surface: 'paper' }).root, cardClass)} aria-label={t('title')}>
      <div className={headRowClass}>
        <h2 className={cardTitleClass}>{t('title')}</h2>
        <Link href="/history" className={historyLinkClass}>
          {t('viewProgress')} <span aria-hidden="true">→</span>
        </Link>
      </div>

      {error && (
        <p className={errorClass} role="alert" aria-live="polite">
          {error}
        </p>
      )}

      <div className={gridClass}>
        <div className={fieldClass}>
          <label className={eyebrowClass} htmlFor="pref-reciter">
            {t('reciterLabel')}
          </label>
          <select
            id="pref-reciter"
            className={selectClass}
            value={prefs.referenceReciterId}
            onChange={(event) => save({ referenceReciterId: event.target.value })}
            disabled={pending}
          >
            {RECITERS.map((reciter) => (
              <option key={reciter.id} value={reciter.id}>
                {reciter.label}
              </option>
            ))}
          </select>
          <span className={helperClass}>{reciterHelper(prefs.referenceReciterId)}</span>
        </div>

        <div className={fieldClass}>
          <label className={eyebrowClass} htmlFor="pref-speed">
            {t('speedLabel')}
          </label>
          <select
            id="pref-speed"
            className={selectClass}
            value={String(prefs.defaultPlaybackSpeed)}
            onChange={(event) => save({ defaultPlaybackSpeed: Number(event.target.value) })}
            disabled={pending}
          >
            {speedOptions.map((speed) => (
              <option key={speed} value={String(speed)}>
                {formatSpeed(speed)}
              </option>
            ))}
          </select>
          <span className={helperClass}>{t('speedHelper')}</span>
        </div>
      </div>

      <div className={reminderRowClass}>
        <span className={stackClass}>
          <span className={eyebrowClass}>{t('reminderLabel')}</span>
          <span className={primaryClass}>
            {prefs.dailyReminderEnabled
              ? t('reminderStatusOn', { time: prefs.dailyReminderTime })
              : t('reminderStatusOff')}
          </span>
          <span className={helperClass}>{t('reminderHelper')}</span>
        </span>
        <button
          type="button"
          className={cx(toggleClass, prefs.dailyReminderEnabled ? toggleOnClass : toggleOffClass)}
          role="switch"
          aria-checked={prefs.dailyReminderEnabled}
          aria-label={t('reminderLabel')}
          onClick={() => save({ dailyReminderEnabled: !prefs.dailyReminderEnabled })}
          disabled={pending}
        >
          <span
            className={cx(knobClass, prefs.dailyReminderEnabled ? knobOnClass : knobOffClass)}
            aria-hidden="true"
          />
        </button>
      </div>

      {prefs.dailyReminderEnabled && (
        <div className={timeRowClass}>
          <label className={eyebrowClass} htmlFor="pref-reminder-time">
            {t('reminderTimeLabel')}
          </label>
          <input
            id="pref-reminder-time"
            className={timeInputClass}
            type="time"
            value={prefs.dailyReminderTime}
            onChange={(event) => {
              if (event.target.value) save({ dailyReminderTime: event.target.value });
            }}
            disabled={pending}
          />
        </div>
      )}
    </section>
  );
}
