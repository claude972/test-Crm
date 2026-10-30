import { buildStructureMetricColumns } from '@/structures/utils/buildStructureMetricColumns';

const buildTotal = (key: string) => ({
  key,
  status: 'AVAILABLE' as const,
  value: 0,
  contributingStructures: 1,
  totalStructures: 1,
});

const buildMetric = (key: string) => ({
  key,
  status: 'AVAILABLE' as const,
  value: 0,
});

const buildRow = (keys: string[]) => ({
  structure: {
    workspaceId: 'workspace-1',
    displayName: 'Example',
    isCurrent: false,
    requiresAuthentication: false,
    workspaceUrls: { subdomainUrl: '', customUrl: null },
  },
  metrics: keys.map(buildMetric),
});

describe('buildStructureMetricColumns', () => {
  it('keeps the server ordering of the totals', () => {
    expect(
      buildStructureMetricColumns({
        totals: ['companies', 'people', 'tasks'].map(buildTotal),
        structures: [],
      }),
    ).toEqual(['companies', 'people', 'tasks']);
  });

  // The defect this replaces: a metric a structure reported, with no total of
  // its own, had no column and was never drawn.
  it('adds a key a structure reported but the totals do not carry', () => {
    expect(
      buildStructureMetricColumns({
        totals: [buildTotal('companies')],
        structures: [buildRow(['companies', 'opportunities'])],
      }),
    ).toEqual(['companies', 'opportunities']);
  });

  it('keeps the totals first, so familiar columns do not move', () => {
    const columns = buildStructureMetricColumns({
      totals: ['companies', 'people'].map(buildTotal),
      structures: [buildRow(['opportunities', 'people'])],
    });

    expect(columns).toEqual(['companies', 'people', 'opportunities']);
  });

  it('does not repeat a key reported by several structures', () => {
    expect(
      buildStructureMetricColumns({
        totals: [],
        structures: [buildRow(['tasks']), buildRow(['tasks', 'people'])],
      }),
    ).toEqual(['tasks', 'people']);
  });

  it('still produces every reported column when the server summed nothing', () => {
    expect(
      buildStructureMetricColumns({
        totals: [],
        structures: [buildRow(['companies', 'people'])],
      }),
    ).toEqual(['companies', 'people']);
  });

  it('produces no column when nothing was reported at all', () => {
    expect(
      buildStructureMetricColumns({ totals: [], structures: [] }),
    ).toEqual([]);
  });
});
