import { afterEach, describe, it, expect, vi } from 'vitest';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ResultFrame } from '../ResultFrame';
import messages from '../../../../../../messages/en.json';

vi.mock('../../../../../../i18n/navigation', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) =>
    React.createElement('a', props, children)
}));

afterEach(() => cleanup());

describe('ResultFrame', () => {
  it('links back to the ayah that was just practised', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <ResultFrame surahId="1" surahName="Al-Fatihah" ayahNumber={2}>
          <p>content</p>
        </ResultFrame>
      </NextIntlClientProvider>
    );
    const back = screen.getByRole('link', { name: /back to al-fatihah, ayah 2/i });
    expect(back).toHaveAttribute('href', '/practice/1/2');
    expect(screen.getByText('content')).toBeInTheDocument();
  });
});
