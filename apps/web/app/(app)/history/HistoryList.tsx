'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getRecentAttempts, type Attempt } from '../../lib/storage';
import { formatPracticedAt } from '../../lib/classify';
import { ArrowRightIcon } from '../../components/icons/ArrowRightIcon';
import { css, cx } from '../../../styled-system/css';
import { statusPill } from '../../../styled-system/recipes';

const HISTORY_MOBILE_MQ = '@media (max-width: 640px)';

const listClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '3',
  listStyle: 'none',
  padding: '[0]',
  margin: '[0]'
});

const listItemClass = css({ listStyle: 'none' });

const rowClass = css({
  display: 'grid',
  gridTemplateColumns: 'auto 1fr auto auto',
  alignItems: 'center',
  gap: '4',
  paddingBlock: '4',
  paddingInline: '5',
  backgroundColor: 'bg.paper',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  borderRadius: 'md',
  textDecoration: 'none',
  color: '[inherit]',
  [HISTORY_MOBILE_MQ]: {
    gridTemplateColumns: '1fr auto',
    gridTemplateAreas: '"score status" "info  info"'
  }
});

const scoreBaseClass = css({
  fontFamily: 'serif',
  fontSize: '[28px]',
  color: 'teal',
  minWidth: '[64px]',
  fontVariantNumeric: 'tabular-nums',
  [HISTORY_MOBILE_MQ]: { gridArea: 'score' }
});

const scoreFailedClass = css({
  color: 'red',
  fontSize: '[16px]'
});

const infoClass = css({
  [HISTORY_MOBILE_MQ]: { gridArea: 'info' }
});

const titleClass = css({
  fontFamily: 'serif',
  fontSize: '[18px]',
  color: 'ink.strong'
});

const metaClass = css({
  fontSize: '[13px]',
  color: 'ink.muted',
  marginTop: '[2px]'
});

const statusPillMobileClass = css({
  [HISTORY_MOBILE_MQ]: { gridArea: 'status' }
});

const emptyClass = css({
  textAlign: 'center',
  paddingBlock: '12',
  paddingInline: '6',
  backgroundColor: 'bg.paper',
  borderRadius: 'md',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  color: 'ink.muted'
});

const emptyTitleClass = css({
  fontFamily: 'serif',
  fontSize: '[24px]',
  color: 'ink.strong',
  marginBottom: '3'
});

const emptyCtaClass = css({ marginTop: '4', textDecoration: 'none' });

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
};

type Props = {
  signedIn: boolean;
};

export function HistoryList({ signedIn }: Props) {
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);

  useEffect(() => {
    setAttempts(getRecentAttempts());
  }, []);

  if (!signedIn) {
    return (
      <div className={emptyClass}>
        <p className={emptyTitleClass}>Sign in to track your practice</p>
        <p>
          Your attempts, best scores and continue-from progress sync across devices when you have an
          account.
        </p>
        <Link href="/sign-in" className={cx(statusPill({ tone: 'completed' }), emptyCtaClass)}>
          Sign in <ArrowRightIcon size={14} />
        </Link>
      </div>
    );
  }

  if (attempts === null) {
    return null; // first paint, before localStorage hydrate
  }

  if (attempts.length === 0) {
    return (
      <div className={emptyClass}>
        <p className={emptyTitleClass}>No attempts yet</p>
        <p>Your recent recitation scores will appear here once you start practicing.</p>
        <Link href="/" className={cx(statusPill({ tone: 'completed' }), emptyCtaClass)}>
          Browse the surah library <ArrowRightIcon size={14} />
        </Link>
      </div>
    );
  }

  return (
    <ul className={listClass}>
      {attempts.map((a) => {
        const completed = a.status === 'COMPLETED';
        return (
          <li key={a.id} className={listItemClass}>
            <Link href={`/practice/${a.surahId}/${a.ayahNumber}`} className={rowClass}>
              <span
                className={completed ? scoreBaseClass : cx(scoreBaseClass, scoreFailedClass)}
                aria-label={completed ? `Score ${a.score}` : 'Failed attempt'}
              >
                {completed && a.score !== null ? a.score : '—'}
              </span>
              <div className={infoClass}>
                <p className={titleClass}>
                  {a.surahNameEn} · ayah {a.ayahNumber}
                </p>
                <p className={metaClass}>
                  {formatDate(a.createdAt)} · {formatPracticedAt(a.createdAt)}
                </p>
              </div>
              <span
                className={cx(
                  statusPill({ tone: completed ? 'completed' : 'failed' }),
                  statusPillMobileClass
                )}
              >
                {completed ? 'Completed' : 'Failed'}
              </span>
              <ArrowRightIcon size={14} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
