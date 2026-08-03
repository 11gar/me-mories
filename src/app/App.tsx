import { AppProviders } from './providers/AppProviders';
import { AppRoutes } from './router/routes';

export function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}
