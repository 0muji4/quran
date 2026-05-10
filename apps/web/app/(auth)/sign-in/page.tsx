import { AuthForm } from '../AuthForm';

export const metadata = {
  title: 'Sign in · Tilawah'
};

export default function SignInPage() {
  return <AuthForm mode="signin" />;
}
