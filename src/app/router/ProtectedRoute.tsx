import { Navigate, Outlet, useLocation } from 'react-router';

import { useAuth } from '@/app/providers/authContext';
import { Spinner } from '@/ui';

import { ROUTES } from './paths';
import styles from './RouteGuards.module.scss';

function FullPageLoader() {
  return (
    <div className={styles.loader}>
      <Spinner size={28} label="Chargement de votre session" />
    </div>
  );
}

interface RedirectState {
  from?: string;
}

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  // `loading` must not fall through to the redirect: Firebase restores the
  // session asynchronously, and bouncing to /login first would flash the login
  // screen at every returning user.
  if (status === 'loading') return <FullPageLoader />;

  if (status === 'anonymous') {
    // Remember where they were headed so sign-in can return them there.
    const from = `${location.pathname}${location.search}`;
    return <Navigate to={ROUTES.login} state={{ from } satisfies RedirectState} replace />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader />;

  if (status === 'authenticated') {
    // The guard owns the post-sign-in destination, not the form. Having the
    // form navigate too created a race the guard always won, dropping the user
    // on the home page instead of the page they originally asked for.
    const { from } = (location.state as RedirectState | null) ?? {};
    return <Navigate to={from ?? ROUTES.home} replace />;
  }

  return <Outlet />;
}
