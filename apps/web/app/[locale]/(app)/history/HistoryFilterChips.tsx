import { css, cx } from '../../../../styled-system/css';
import { button } from '../../../../styled-system/recipes';
import { filterKey, type HistoryFilter } from './historyFilters';

const rowClass = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '2',
  marginBottom: '5'
});

// Pill recipe pairs with `button({ tone: 'nav' })` from the Library
// filter row (`LibraryClient.tsx`) so the History chips look like the
// Library chips by construction rather than by accident.
const pillActiveClass = css({
  backgroundColor: 'ink.strong',
  borderColor: 'ink.strong',
  color: 'bg.paper'
});

type Props = {
  options: HistoryFilter[];
  selected: HistoryFilter;
  onSelect: (filter: HistoryFilter) => void;
};

export function HistoryFilterChips({ options, selected, onSelect }: Props) {
  const baseClass = button({ tone: 'nav', size: 'lg' });
  const selectedKey = filterKey(selected);

  return (
    <div className={rowClass} role="group" aria-label="Filter attempts by surah">
      {options.map((option) => {
        const key = filterKey(option);
        const active = key === selectedKey;
        const label = option.kind === 'all' ? 'All' : option.nameEn;
        return (
          <button
            key={key}
            type="button"
            className={active ? cx(baseClass, pillActiveClass) : baseClass}
            onClick={() => onSelect(option)}
            aria-pressed={active}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
