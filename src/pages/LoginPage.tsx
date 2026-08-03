import { AuthForm } from '@/features/auth/components/AuthForm';

/**
 * No redirect logic here on purpose: `PublicOnlyRoute` already reacts to the
 * auth state and owns where a signed-in user lands.
 */
export function LoginPage() {
  return <AuthForm />;
}
