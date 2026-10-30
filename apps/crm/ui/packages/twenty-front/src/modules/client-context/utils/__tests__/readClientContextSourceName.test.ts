import { type ClientContextProvenance } from '@/client-context/types/ClientContextProvenance';
import { readClientContextSourceName } from '@/client-context/utils/readClientContextSourceName';

const buildProvenance = (
  provenance: Partial<ClientContextProvenance>,
): ClientContextProvenance => ({
  sourceId: 'forms',
  sourceLabel: 'Forms',
  externalId: 'external-1',
  receivedAt: null,
  ...provenance,
});

describe('readClientContextSourceName', () => {
  it('prefers the label the server sent', () => {
    expect(readClientContextSourceName(buildProvenance({}))).toBe('Forms');
  });

  it('falls back to the identifier rather than to nothing', () => {
    expect(
      readClientContextSourceName(buildProvenance({ sourceLabel: '   ' })),
    ).toBe('forms');
  });

  // The defect this guards against: an unattributed item inheriting the name
  // of the section it is shown under, which would claim a provenance the
  // payload never stated.
  it('reports an unattributed item as having no source name', () => {
    expect(
      readClientContextSourceName(
        buildProvenance({ sourceLabel: null, sourceId: null }),
      ),
    ).toBeNull();
  });
});
