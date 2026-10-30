import { buildHermesModuleNavigationItems } from '@/hermes-shell/utils/buildHermesModuleNavigationItems';

const keysOf = (items: { key: string }[]) => items.map((item) => item.key);

describe('buildHermesModuleNavigationItems', () => {
  // The reason this exists: the dashboard is mounted outside this drawer, so
  // without an entry here a new account lands on a record list and has no
  // route into the Hermes space but a typed URL.
  it('always offers the dashboard, whatever the permissions', () => {
    expect(
      keysOf(
        buildHermesModuleNavigationItems({
          hasWorkspacePermission: false,
          pathname: '/objects/companies',
        }),
      ),
    ).toContain('dashboard');
  });

  it('points the dashboard at a path nobody has to guess', () => {
    const [dashboard] = buildHermesModuleNavigationItems({
      hasWorkspacePermission: false,
      pathname: '/objects/companies',
    });

    expect(dashboard.to).toBe('/dashboard');
  });

  it('offers the reception to a workspace administrator', () => {
    expect(
      keysOf(
        buildHermesModuleNavigationItems({
          hasWorkspacePermission: true,
          pathname: '/dashboard',
        }),
      ),
    ).toEqual(['dashboard', 'reception']);
  });

  // Its operations are refused server side for everyone else, and a link that
  // only leads to a refusal is worse than no link.
  it('does not offer the reception without the workspace permission', () => {
    expect(
      keysOf(
        buildHermesModuleNavigationItems({
          hasWorkspacePermission: false,
          pathname: '/dashboard',
        }),
      ),
    ).not.toContain('reception');
  });

  it('marks the dashboard current only on the dashboard itself', () => {
    const onDashboard = buildHermesModuleNavigationItems({
      hasWorkspacePermission: true,
      pathname: '/dashboard',
    });
    const elsewhere = buildHermesModuleNavigationItems({
      hasWorkspacePermission: true,
      pathname: '/prospection',
    });

    expect(onDashboard[0].isActive).toBe(true);
    expect(elsewhere[0].isActive).toBe(false);
  });

  it('keeps the reception current on a batch opened through the search parameter', () => {
    const [, reception] = buildHermesModuleNavigationItems({
      hasWorkspacePermission: true,
      pathname: '/prospection/campaign-audiences/list-1',
    });

    expect(reception.isActive).toBe(true);
  });
});
