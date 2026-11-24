'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '../../../../i18n/navigation';
import { updatePreferencesAction } from '../../../actions';
import type { PracticePreferences } from '../../../lib/preferences';
import { RECITERS, reciterHelper } from '../../../lib/reciters';
import { ArrowRightIcon } from '../../../components/icons/ArrowRightIcon';
import { SelectField } from '../../../components/AppField';
import { ErrorPanel } from '../../../components/ErrorPanel';
import { css, cx } from '../../../../styled-system/css';
import { appButton, appSwitch, appTextField } from '../../../../styled-system/recipes';
import {
  cardTitleClass,
  dividedClass,
  filledCardClass,
  helperClass,
  primaryClass,
  rowClass,
  rowTextClass
} from './cardStyles';

interface Props {
  preferences: PracticePreferences;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const formatSpeed = (speed: number): string => `${speed.toFixed(2)}×`;

const cardClass = cx(filledCardClass, css({ gap: '4' }));

const headClass = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  columnGap: '2'
});

// Its label lines up with the card's edges, beside the title or below it.
const historyLinkClass = cx(appButton({ variant: 'text' }), css({ marginInline: '[-12px]' }));

const fieldsClass = css({
  display: 'grid',
  gridTemplateColumns: '[minmax(0, 1fr)]',
  gap: '4',
  medium: { gridTemplateColumns: '[repeat(2, minmax(0, 1fr))]' }
});

const reminderRowClass = cx(rowClass, dividedClass, css({ paddingTop: '4' }));

const reminderHelperClass = css({
  marginTop: '1',
  textStyle: 'bodySmall',
  color: 'onSurfaceVariant'
});

const timeRowClass = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  columnGap: '4',
  rowGap: '2'
});

const timeInputClass = cx(appTextField(), css({ width: '[auto]' }));

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
    <section className={cardClass} aria-labelledby="preferences-title">
      <div className={headClass}>
        <h2 id="preferences-title" className={cardTitleClass}>
          {t('title')}
        </h2>
        <Link href="/history" className={historyLinkClass}>
          {t('viewProgress')} <ArrowRightIcon size={18} />
        </Link>
      </div>

      {error && <ErrorPanel>{error}</ErrorPanel>}

      <div className={fieldsClass}>
        <SelectField
          id="pref-reciter"
          label={t('reciterLabel')}
          helper={reciterHelper(prefs.referenceReciterId)}
          value={prefs.referenceReciterId}
          onChange={(event) => save({ referenceReciterId: event.target.value })}
          disabled={pending}
        >
          {RECITERS.map((reciter) => (
            <option key={reciter.id} value={reciter.id}>
              {reciter.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="pref-speed"
          label={t('speedLabel')}
          helper={t('speedHelper')}
          value={String(prefs.defaultPlaybackSpeed)}
          onChange={(event) => save({ defaultPlaybackSpeed: Number(event.target.value) })}
          disabled={pending}
        >
          {speedOptions.map((speed) => (
            <option key={speed} value={String(speed)}>
              {formatSpeed(speed)}
            </option>
          ))}
        </SelectField>
      </div>

      <div className={reminderRowClass}>
        <span className={rowTextClass}>
          <span className={primaryClass}>{t('reminderLabel')}</span>
          <span className={helperClass}>
            {prefs.dailyReminderEnabled
              ? t('reminderStatusOn', { time: prefs.dailyReminderTime })
              : t('reminderStatusOff')}
          </span>
          <span className={reminderHelperClass}>{t('reminderHelper')}</span>
        </span>
        <button
          type="button"
          className={appSwitch()}
          role="switch"
          aria-checked={prefs.dailyReminderEnabled}
          aria-label={t('reminderLabel')}
          onClick={() => save({ dailyReminderEnabled: !prefs.dailyReminderEnabled })}
          disabled={pending}
        />
      </div>

      {prefs.dailyReminderEnabled && (
        <div className={timeRowClass}>
          <label className={primaryClass} htmlFor="pref-reminder-time">
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
