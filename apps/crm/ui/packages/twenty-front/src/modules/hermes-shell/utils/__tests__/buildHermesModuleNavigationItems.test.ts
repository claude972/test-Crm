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

  it('offers the messaging inbox and the reception to a workspace administrator', () => {
    expect(
      keysOf(
        buildHermesModuleNavigationItems({
          hasWorkspacePermission: true,
          pathname: '/dashboard',
        }),
      ),
    ).toEqual([
      'dashboard',
      'messaging',
      'whatsapp',
      'mailbox',
      'connections',
      'reception',
    ]);
  });

  // Its operations are refused server side for everyone else, and a link that
  // only leads to a refusal is worse than no link.
  // Its operations are restricted to unrestricted workspace administrators
  // server side, exactly like the reception.
  it('does not offer the messaging inbox without the workspace permission', () => {
    expect(
      keysOf(
        buildHermesModuleNavigationItems({
          hasWorkspacePermission: false,
          pathname: '/dashboard',
        }),
      ),
    ).not.toContain('messaging');
  });

  // The pathname never carries the search parameters, so an opened
  // conversation leaves it at /messaging — the entry stays current because
  // the path does not change, not because startsWith swallows a query.
  it('keeps the messaging inbox current while a conversation is open', () => {
    const [, messaging] = buildHermesModuleNavigationItems({
      hasWorkspacePermission: true,
      pathname: '/messaging',
    });

    expect(messaging.isActive).toBe(true);
  });

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
    const reception = buildHermesModuleNavigationItems({
      hasWorkspacePermission: true,
      pathname: '/prospection/campaign-audiences/list-1',
    }).find((item) => item.key === 'reception');

    expect(reception?.isActive).toBe(true);
  });
});
