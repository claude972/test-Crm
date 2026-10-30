import { type HermesWaMedia } from '@/hermes-wa-ui/types/HermesWaMedia';
import { readHermesWaMediaKind } from '@/hermes-wa-ui/types/HermesWaMediaKind';
import { readHermesWaMediaState } from '@/hermes-wa-ui/types/HermesWaMediaState';
import { type HermesWaMediaSource } from '@/hermes-wa-ui/types/HermesWaMediaSource';
import { readHermesWaMediaAvailability } from '@/hermes-wa-ui/utils/readHermesWaMediaAvailability';

const buildMedia = (overrides: Partial<HermesWaMedia> = {}): HermesWaMedia => ({
  id: 'md-1',
  kind: readHermesWaMediaKind('IMAGE'),
  state: readHermesWaMediaState('READY'),
  name: 'one.png',
  byteSize: 2048,
  mimeType: 'image/png',
  alt: null,
  durationMs: null,
  errorCode: null,
  ...overrides,
});

const RESOLVED: HermesWaMediaSource = {
  kind: 'resolved',
  objectUrl: 'blob:one',
};

describe('readHermesWaMediaAvailability', () => {
  it('renders only when READY, of a known kind, and with a resolved source', () => {
    expect(readHermesWaMediaAvailability(buildMedia(), RESOLVED)).toEqual({
      kind: 'renderable',
      objectUrl: 'blob:one',
    });
  });

  it('keeps each non-ready state as its own reason instead of one failure', () => {
    const reasonFor = (state: string) =>
      readHermesWaMediaAvailability(
        buildMedia({ state: readHermesWaMediaState(state) }),
        RESOLVED,
      );

    expect(reasonFor('PENDING_FETCH')).toEqual({
      kind: 'unavailable',
      reason: 'pendingFetch',
    });
    expect(reasonFor('UPLOADING')).toEqual({
      kind: 'unavailable',
      reason: 'uploading',
    });
    expect(reasonFor('PROCESSING')).toEqual({
      kind: 'unavailable',
      reason: 'processing',
    });
    expect(reasonFor('FAILED')).toEqual({
      kind: 'unavailable',
      reason: 'failed',
    });
    expect(reasonFor('QUARANTINED')).toEqual({
      kind: 'unavailable',
      reason: 'quarantined',
    });
    expect(reasonFor('EXPIRED')).toEqual({
      kind: 'unavailable',
      reason: 'expired',
    });
  });

  it('does not treat an unreadable state as ready', () => {
    expect(
      readHermesWaMediaAvailability(
        buildMedia({ state: readHermesWaMediaState('ARCHIVED_SOMEWHERE') }),
        RESOLVED,
      ),
    ).toEqual({ kind: 'unavailable', reason: 'unknownState' });

    expect(
      readHermesWaMediaAvailability(
        buildMedia({ state: readHermesWaMediaState(null) }),
        RESOLVED,
      ),
    ).toEqual({ kind: 'unavailable', reason: 'unknownState' });
  });

  it('does not pick a renderer for a kind it cannot read', () => {
    expect(
      readHermesWaMediaAvailability(
        buildMedia({ kind: readHermesWaMediaKind('STICKER') }),
        RESOLVED,
      ),
    ).toEqual({ kind: 'unavailable', reason: 'unknownKind' });
  });

  it('keeps the three source states apart, and none of them renders', () => {
    expect(
      readHermesWaMediaAvailability(buildMedia(), { kind: 'absent' }),
    ).toEqual({ kind: 'unavailable', reason: 'sourceAbsent' });

    expect(
      readHermesWaMediaAvailability(buildMedia(), { kind: 'resolving' }),
    ).toEqual({ kind: 'unavailable', reason: 'sourceResolving' });

    expect(
      readHermesWaMediaAvailability(buildMedia(), { kind: 'expired' }),
    ).toEqual({ kind: 'unavailable', reason: 'sourceExpired' });
  });

  it('treats a resolved source carrying a blank URL as no source at all', () => {
    expect(
      readHermesWaMediaAvailability(buildMedia(), {
        kind: 'resolved',
        objectUrl: '   ',
      }),
    ).toEqual({ kind: 'unavailable', reason: 'sourceAbsent' });
  });

  it('reports the media state before the source, because it is the better answer', () => {
    expect(
      readHermesWaMediaAvailability(
        buildMedia({ state: readHermesWaMediaState('PROCESSING') }),
        { kind: 'absent' },
      ),
    ).toEqual({ kind: 'unavailable', reason: 'processing' });
  });

  it('trims the object URL it hands back', () => {
    expect(
      readHermesWaMediaAvailability(buildMedia(), {
        kind: 'resolved',
        objectUrl: '  blob:two  ',
      }),
    ).toEqual({ kind: 'renderable', objectUrl: 'blob:two' });
  });
});
