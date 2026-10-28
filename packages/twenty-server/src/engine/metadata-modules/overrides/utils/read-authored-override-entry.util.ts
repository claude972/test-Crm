import { type AllMetadataName } from 'kovaa-lab-shared/metadata';

import { normalizeAuthoredOverrides } from 'src/engine/metadata-modules/overrides/utils/normalize-authored-overrides.util';

export const readAuthoredOverrideEntry = <TEntry>({
  metadataName,
  overrides,
  authorUniversalIdentifier,
  workspaceCustomApplicationUniversalIdentifier,
}: {
  metadataName: AllMetadataName;
  overrides: unknown;
  authorUniversalIdentifier: string;
  workspaceCustomApplicationUniversalIdentifier: string;
}): TEntry | undefined =>
  normalizeAuthoredOverrides<TEntry>({
    metadataName,
    overrides,
    workspaceCustomApplicationUniversalIdentifier,
  })?.[authorUniversalIdentifier];
