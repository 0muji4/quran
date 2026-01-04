import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

import RootLayout from '../layout';

describe('RootLayout', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders header with brand title and subtitle', () => {
    render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );

    expect(screen.getByText('Quran Project')).toBeInTheDocument();
    expect(screen.getByText('Recorder')).toBeInTheDocument();
  });

  it('renders children in main element', () => {
    render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    const { container } = render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );

    expect(container.querySelector('.page-shell')).toBeInTheDocument();
    expect(container.querySelector('.page-header')).toBeInTheDocument();
    expect(container.querySelector('.page-content')).toBeInTheDocument();
    expect(container.querySelector('.brand')).toBeInTheDocument();
  });

  it('renders emoji icon with aria-hidden', () => {
    const { container } = render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );

    const emoji = container.querySelector('[aria-hidden="true"]');
    expect(emoji).toBeInTheDocument();
    expect(emoji?.textContent).toBe('📖');
  });

  it('renders html with lang attribute', () => {
    const { container } = render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );

    const html = container.querySelector('html');
    expect(html).toHaveAttribute('lang', 'en');
  });
});
