'use client';

import { useTranslations } from 'next-intl';
import { css, cx } from '../../../../styled-system/css';
import { appButton } from '../../../../styled-system/recipes';

interface Props {
  reasons: string[];
  hint?: string;
  canReplay: boolean;
  onReplay?: () => void;
  onRecordAgain: () => void;
}

const cardClass = css({ display: 'flex', flexDirection: 'column', gap: '3', paddingTop: '2' });

const reasonsClass = css({ margin: '0', paddingInlineStart: '5', textStyle: 'bodyMedium' });

const hintClass = css({ margin: '0', textStyle: 'bodyMedium' });

const actionsClass = css({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  gap: '2'
});

// Text on the error container takes the container's own colour.
const replayClass = cx(appButton({ variant: 'text' }), css({ color: 'onErrorContainer' }));

// The body of the "could not score" panel: why, what to do, and the two
// actions. The panel's title and subtitle live in RecorderPanel.
export function ScoringErrorCard({ reasons, hint, canReplay, onReplay, onRecordAgain }: Props) {
  const t = useTranslations('practice.scoringError');
  const resolvedHint = hint ?? t('defaultHint');

  return (
    <div className={cardClass} role="alert">
      {reasons.length > 0 ? (
        <ul className={reasonsClass}>
          {reasons.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      ) : null}

      <p className={hintClass}>{resolvedHint}</p>

      <div className={actionsClass}>
        {canReplay ? (
          <button type="button" className={replayClass} onClick={onReplay}>
            {t('replay')}
          </button>
        ) : null}
        <button type="button" className={appButton({ variant: 'filled' })} onClick={onRecordAgain}>
          {t('recordAgain')}
        </button>
      </div>
    </div>
  );
}
