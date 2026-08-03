import { Link } from 'react-router';

import { ROUTES } from '@/app/router/paths';
import { Button, EmptyState, Icon, Page } from '@/ui';

export function NotFoundPage() {
  return (
    <Page title="Page introuvable">
      <EmptyState
        icon={<Icon name="search" size={22} />}
        title="Cette page n’existe pas"
        description="Le lien est peut-être incorrect, ou la page a été déplacée."
        action={
          <Link to={ROUTES.home}>
            <Button variant="primary">Retour à l’accueil</Button>
          </Link>
        }
      />
    </Page>
  );
}
