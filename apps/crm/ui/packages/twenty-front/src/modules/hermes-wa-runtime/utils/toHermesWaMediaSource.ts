import {
  HERMES_WA_ABSENT_MEDIA_SOURCE,
  type HermesWaMediaSource,
} from '@/hermes-wa-ui/types/HermesWaMediaSource';

import { type HermesWaMediaAccess } from '@/hermes-wa-runtime/types/HermesWaUploadTarget';

// This module's access state as the library's source prop.
//
// `idle`, `failed` and `denied` all become `absent`, which is the library's
// "no access obtained — the media itself may be fine". They are not merged on
// screen: the panel says which one it is in its own words. What they share is
// that there is no blob: URL to render, and the library's default is already
// "no access until someone proves otherwise".
//
// Nothing here produces `expired`. An expiry is the server's to announce; a
// local clock deciding a sixty-second token has lapsed would refuse a URL that
// still works.
export const toHermesWaMediaSource = (
  access: HermesWaMediaAccess,
): HermesWaMediaSource => {
  if (access.kind === 'resolving') {
    return { kind: 'resolving' };
  }

  if (access.kind === 'resolved') {
    return { kind: 'resolved', objectUrl: access.objectUrl };
  }

  return HERMES_WA_ABSENT_MEDIA_SOURCE;
};
