import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { SurahRow } from '../SurahRow';
import messages from '../../../../../messages/en.json';

vi.mock('../../../../../i18n/navigation', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) =>
    React.createElement('a', props, children)
}));

afterEach(cleanup);

const surah = {
  id: '1',
  nameEn: 'Al-Fatihah',
  nameAr: 'الفاتحة',
  ayahCount: 7,
  revelationPlace: 'Mecca'
};

const renderRow = (props: Partial<React.ComponentProps<typeof SurahRow>> = {}) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SurahRow surah={surah} bestScore={null} isLastPracticed={false} {...props} />
    </NextIntlClientProvider>
  );

describe('SurahRow', () => {
  it('links to the first ayah and names the surah, place and ayah count', () => {
    renderRow();
    const link = screen.getByRole('link', { name: /^Al-Fatihah\s*,\s*Mecca\s*,\s*7 ayahs$/ });
    expect(link).toHaveAttribute('href', '/practice/1/1');
  });

  it('adds the best score once there is one', () => {
    renderRow({ bestScore: 87 });
    expect(screen.getByText('best 87')).toBeInTheDocument();
  });

  it('marks the surah the user left off at', () => {
    renderRow({ isLastPracticed: true });
    expect(screen.getByRole('link', { name: /where you left off/ })).toBeInTheDocument();
  });
});
