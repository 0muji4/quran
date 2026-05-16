import { getTranslations } from 'next-intl/server';
import { AuthBrandPanel } from './AuthBrandPanel';
import { AuthForm } from './AuthForm';
import type { AuthMode } from './copy';
import { css, cx } from '../../../styled-system/css';

type Props = {
  mode: AuthMode;
  redirectTo?: string;
};

const formPanelClass = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingBlock: '10',
  paddingInline: '8',
  '@media (max-width: 720px)': {
    paddingBlock: '8',
    paddingInline: '4'
  }
});

const formColumnClass = css({
  display: 'flex',
  flexDirection: 'column',
  width: '[100%]',
  maxWidth: '[420px]'
});

// Pairs with the global .eyebrow class — only adds spacing.
const eyebrowSpacingClass = css({ marginBottom: '2' });

const titleClass = css({
  fontFamily: 'serif',
  fontSize: '[clamp(28px, 3.4vw, 36px)]',
  fontWeight: 600,
  lineHeight: '[1.15]',
  color: 'ink.strong'
});

const ledeClass = css({
  marginTop: '3',
  color: 'ink.muted',
  fontSize: '[14px]',
  lineHeight: '[1.6]'
});

// Top-level composition for /sign-in and /sign-up: the dark brand panel
// plus the form panel (eyebrow / title / lede + the interactive AuthForm).
// Server component — AuthForm is the only client island.
export async function AuthScreen({ mode, redirectTo }: Props) {
  const t = await getTranslations(`auth.${mode}`);

  return (
    <>
      <AuthBrandPanel />
      <div className={formPanelClass}>
        <section className={formColumnClass} aria-labelledby="auth-title">
          <p className={cx('eyebrow', eyebrowSpacingClass)}>
            <span aria-hidden="true">✦</span> {t('eyebrow')}
          </p>
          <h1 id="auth-title" className={titleClass}>
            {t('title')}
          </h1>
          <p className={ledeClass}>{t('lede')}</p>
          <AuthForm mode={mode} redirectTo={redirectTo} />
        </section>
      </div>
    </>
  );
}
