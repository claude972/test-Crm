// Paths this shell owns. They are deliberately not in AppPath: twenty-shared
// belongs to another contributor, so the shell carries its own constants until
// the routes are wired upstream. Keep them brand-free in the URL — the visible
// product name belongs in the interface, not in the path.
export const HERMES_SHELL_ROUTE_PATHS = {
  operationsDashboard: '/dashboard',
} as const;
