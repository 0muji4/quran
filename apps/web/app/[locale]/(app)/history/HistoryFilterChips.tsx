'use client';

import { useTranslations } from 'next-intl';
import { CheckIcon } from '../../../components/icons/ArrowRightIcon';
import { css, cx } from '../../../../styled-system/css';
import { appChip } from '../../../../styled-system/recipes';
import { filterKey, type HistoryFilter } from './historyFilters';

const rowClass = css({ flex: '[1 1 280px]', display: 'flex', flexWrap: 'wrap', gap: '2' });

const chipClass = cx(appChip(), css({ _pressed: { paddingInlineStart: '2' } }));

interface Props {
  options: HistoryFilter[];
  selected: HistoryFilter;
  onSelect: (filter: HistoryFilter) => void;
}

export function HistoryFilterChips({ options, selected, onSelect }: Props) {
  const t = useTranslations('history.filter');
  const selectedKey = filterKey(selected);

  return (
    <div className={rowClass} role="group" aria-label={t('ariaLabel')}>
      {options.map((option) => {
        const key = filterKey(option);
        const active = key === selectedKey;
        return (
          <button
            key={key}
            type="button"
            className={chipClass}
            onClick={() => onSelect(option)}
            aria-pressed={active}
          >
            {active && <CheckIcon />}
            {option.kind === 'all' ? t('all') : option.nameEn}
          </button>
        );
      })}
    </div>
  );
}
