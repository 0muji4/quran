import { ChangeEmailButton } from './ChangeEmailButton';
import { UpdatePasswordButton } from './UpdatePasswordButton';
import { css, cx } from '../../../../styled-system/css';
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
  email: string;
  passwordChangedAt: string | null;
}

const itemClass = cx(rowClass, css({ minHeight: '[72px]', paddingBlock: '2' }));

const labelClass = css({ textStyle: 'labelMedium', color: 'onSurfaceVariant' });

const changedDateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
});

const formatChangedDate = (iso: string): string | null => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : changedDateFormatter.format(date);
};

// "Account & data": Email and Password rows, each with its own edit sheet.
export function AccountDataCard({ email, passwordChangedAt }: Props) {
  const changedOn = passwordChangedAt ? formatChangedDate(passwordChangedAt) : null;
  const passwordHelper = changedOn
    ? `Last changed ${changedOn}`
    : 'Rotate when you suspect a leak or every few months.';
  return (
    <section className={filledCardClass} aria-labelledby="account-title">
      <h2 id="account-title" className={cardTitleClass}>
        Account & data
      </h2>

      <div className={itemClass}>
        <div className={rowTextClass}>
          <span className={labelClass}>Email</span>
          <span className={primaryClass}>{email}</span>
          <span className={helperClass}>Used for sign-in and account recovery</span>
        </div>
        <ChangeEmailButton currentEmail={email} />
      </div>

      <div className={cx(itemClass, dividedClass)}>
        <div className={rowTextClass}>
          <span className={labelClass}>Password</span>
          <span className={primaryClass}>•••••••••••</span>
          <span className={helperClass}>{passwordHelper}</span>
        </div>
        <UpdatePasswordButton />
      </div>
    </section>
  );
}
