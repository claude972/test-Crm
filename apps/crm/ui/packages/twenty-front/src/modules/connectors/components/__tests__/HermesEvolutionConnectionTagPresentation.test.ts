import { CONNECTOR_STATE_TAG_PRESENTATION } from '@/connectors/components/ConnectorStateTag';
import { HERMES_EVOLUTION_CONNECTION_TAG_PRESENTATION } from '@/connectors/components/HermesEvolutionConnectionTag';
import { HERMES_EVOLUTION_CONNECTION_STATUSES } from '@/connectors/types/HermesEvolutionConnectionStatus';

// The states no value in this contract proves, and which therefore must stay
// distinguishable without colour.
const UNPROVEN_STATUSES = ['PROVIDER_REPORTED_OPEN', 'CONNECTING'] as const;

describe('HERMES_EVOLUTION_CONNECTION_TAG_PRESENTATION', () => {
  it('covers every published status and nothing else', () => {
    expect(Object.keys(HERMES_EVOLUTION_CONNECTION_TAG_PRESENTATION).sort()).toEqual(
      [...HERMES_EVOLUTION_CONNECTION_STATUSES].sort(),
    );
  });

  it('never presents a status as a success', () => {
    for (const status of HERMES_EVOLUTION_CONNECTION_STATUSES) {
      const { color, variant } =
        HERMES_EVOLUTION_CONNECTION_TAG_PRESENTATION[status];

      expect(['jade', 'green', 'grass', 'mint']).not.toContain(color);
      expect(variant).not.toBe('solid');
    }
  });

  it('marks an unproven status with a dashed border that actually renders', () => {
    for (const status of UNPROVEN_STATUSES) {
      const { variant, borderStyle } =
        HERMES_EVOLUTION_CONNECTION_TAG_PRESENTATION[status];

      expect(borderStyle).toBe('dashed');
      // Tag only paints a border in the outline variant, so a dashed border on
      // any other variant is invisible and the cue would rest on hue alone.
      expect(variant).toBe('outline');
    }
  });

  it('leaves the proven-nothing cue off the states that are not claims of capability', () => {
    for (const status of HERMES_EVOLUTION_CONNECTION_STATUSES) {
      if ((UNPROVEN_STATUSES as readonly string[]).includes(status)) {
        continue;
      }

      expect(
        HERMES_EVOLUTION_CONNECTION_TAG_PRESENTATION[status].borderStyle,
      ).toBe('solid');
    }
  });

  it('gives each status its own icon so the badges differ without colour', () => {
    const icons = HERMES_EVOLUTION_CONNECTION_STATUSES.map(
      (status) => HERMES_EVOLUTION_CONNECTION_TAG_PRESENTATION[status].Icon,
    );

    expect(new Set(icons).size).toBe(icons.length);
  });
});

describe('CONNECTOR_STATE_TAG_PRESENTATION', () => {
  it('covers the four states that carry no reported status', () => {
    expect(Object.keys(CONNECTOR_STATE_TAG_PRESENTATION).sort()).toEqual([
      'absent',
      'loading',
      'not-reported',
      'unknown',
    ]);
  });

  it('never dresses an absence of knowledge as a fault or a success', () => {
    for (const kind of Object.keys(CONNECTOR_STATE_TAG_PRESENTATION) as Array<
      keyof typeof CONNECTOR_STATE_TAG_PRESENTATION
    >) {
      const { color, variant } = CONNECTOR_STATE_TAG_PRESENTATION[kind];

      expect(color).toBe('gray');
      expect(variant).not.toBe('solid');
    }
  });

  it('shows an unresolved read as dashed, and a stated absence as solid', () => {
    expect(CONNECTOR_STATE_TAG_PRESENTATION.unknown.borderStyle).toBe('dashed');
    expect(CONNECTOR_STATE_TAG_PRESENTATION.loading.borderStyle).toBe('dashed');
    expect(CONNECTOR_STATE_TAG_PRESENTATION['not-reported'].borderStyle).toBe(
      'dashed',
    );
    expect(CONNECTOR_STATE_TAG_PRESENTATION.absent.borderStyle).toBe('solid');
  });
});
