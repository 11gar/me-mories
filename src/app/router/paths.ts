/**
 * Every route in the app, in one place.
 *
 * Links are built from these helpers rather than string literals so a renamed
 * route breaks the build instead of producing a dead link at runtime.
 */
export const ROUTES = {
  home: '/',
  login: '/login',
  memories: '/memories',
  todos: '/todos',
  memory: '/memories/:memoryId',
  calendar: '/calendar',
  swipe: '/swipe',
  tags: '/tags',
  dateTags: '/date-tags',
  settings: '/settings',
} as const;

export const memoryPath = (memoryId: string): string => `/memories/${memoryId}`;

export const searchPath = (params?: URLSearchParams): string => {
  const query = params?.toString() ?? '';
  return query.length > 0 ? `${ROUTES.memories}?${query}` : ROUTES.memories;
};
