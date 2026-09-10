import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';

import { AppLayout } from '@/app/layouts/AppLayout';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { Spinner } from '@/ui';

import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute';
import { ROUTES } from './paths';
import styles from './RouteGuards.module.scss';

// Split per page: the swipe screen pulls in gesture code and the calendar its
// own date machinery, and neither should weigh on first paint.
const LoginPage = lazy(async () => ({ default: (await import('@/pages/LoginPage')).LoginPage }));
const MemoriesPage = lazy(async () => ({
  default: (await import('@/pages/MemoriesPage')).MemoriesPage,
}));
const MemoryDetailPage = lazy(async () => ({
  default: (await import('@/pages/MemoryDetailPage')).MemoryDetailPage,
}));
const TodosPage = lazy(async () => ({ default: (await import('@/pages/TodosPage')).TodosPage }));
const HomePage = lazy(async () => ({ default: (await import('@/pages/HomePage')).HomePage }));
const CalendarPage = lazy(async () => ({
  default: (await import('@/pages/CalendarPage')).CalendarPage,
}));
const SwipePage = lazy(async () => ({ default: (await import('@/pages/SwipePage')).SwipePage }));
const TagsPage = lazy(async () => ({ default: (await import('@/pages/TagsPage')).TagsPage }));
const DateTagsPage = lazy(async () => ({
  default: (await import('@/pages/DateTagsPage')).DateTagsPage,
}));
const SettingsPage = lazy(async () => ({
  default: (await import('@/pages/SettingsPage')).SettingsPage,
}));
const NotFoundPage = lazy(async () => ({
  default: (await import('@/pages/NotFoundPage')).NotFoundPage,
}));

function PageFallback() {
  return (
    <div className={styles.loader}>
      <Spinner size={24} label="Chargement" />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route element={<AuthLayout />}>
            <Route path={ROUTES.login} element={<LoginPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path={ROUTES.home} element={<HomePage />} />
            <Route path={ROUTES.memories} element={<MemoriesPage />} />
            <Route path={ROUTES.memory} element={<MemoryDetailPage />} />
            <Route path={ROUTES.todos} element={<TodosPage />} />
            <Route path={ROUTES.calendar} element={<CalendarPage />} />
            <Route path={ROUTES.swipe} element={<SwipePage />} />
            <Route path={ROUTES.tags} element={<TagsPage />} />
            <Route path={ROUTES.dateTags} element={<DateTagsPage />} />
            <Route path={ROUTES.settings} element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
}
