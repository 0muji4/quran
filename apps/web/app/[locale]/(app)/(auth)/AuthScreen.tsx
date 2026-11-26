import { getTranslations } from 'next-intl/server';
import { PageFrame } from '../../../components/PageFrame';
import { AuthForm } from './AuthForm';
import { AyahPanel } from './AyahPanel';
import type { AuthMode } from './copy';
import { css } from '../../../../styled-system/css';

interface Props {
  mode: AuthMode;
  redirectTo?: string;
}

// One column, and from the expanded window size class the form beside the
// ayah panel.
const layoutClass = css({
  display: 'grid',
  gridTemplateColumns: '[minmax(0, 1fr)]',
  alignItems: 'start',
  expanded: { gridTemplateColumns: '[minmax(0, 448px) minmax(0, 1fr)]', gap: '12' }
});

const formColumnClass = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '5',
  minWidth: '[0]'
});

const ledeClass = css({ margin: '0', textStyle: 'bodyLarge', color: 'onSurfaceVariant' });

// Top-level composition for /sign-in and /sign-up: the title, the lede and the
// interactive AuthForm, with the ayah panel in wide windows. Server component —
// AuthForm is the only client island.
export async function AuthScreen({ mode, redirectTo }: Props) {
  const t = await getTranslations(`auth.${mode}`);

  return (
    <PageFrame title={t('title')} narrow>
      <div className={layoutClass}>
        <div className={formColumnClass}>
          <p className={ledeClass}>{t('lede')}</p>
          <AuthForm mode={mode} redirectTo={redirectTo} />
        </div>
        <AyahPanel />
      </div>
    </PageFrame>
  );
}
