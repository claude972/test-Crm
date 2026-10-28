import { STANDARD_OBJECTS } from 'kovaa-lab-shared/metadata';
import { MetadataReadability, MetadataWritability } from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

import { computeKovaaLab CRMStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/kovaa-lab-standard-application/utils/kovaa-lab-standard-application-all-flat-entity-maps.constant';

const WORKSPACE_ID = '20202020-1111-4111-8111-111111111111';
const KOVAALAB_STANDARD_APPLICATION_ID = '20202020-2222-4222-8222-222222222222';
const NOW = '2024-01-01T00:00:00.000Z';

describe('ShortLink standard metadata build', () => {
  const { allFlatEntityMaps } =
    computeKovaaLab CRMStandardApplicationAllFlatEntityMaps({
      now: NOW,
      workspaceId: WORKSPACE_ID,
      kovaa-labStandardApplicationId: KOVAALAB_STANDARD_APPLICATION_ID,
    });
  const shortLink =
    allFlatEntityMaps.flatObjectMetadataMaps.byUniversalIdentifier[
      STANDARD_OBJECTS.shortLink.universalIdentifier
    ];

  it('creates a workspace owned system object with explicit URL meanings', () => {
    expect(shortLink).toMatchObject({
      nameSingular: 'shortLink',
      isSystem: true,
      isUICreatable: false,
      isUIEditable: false,
      readability: MetadataReadability.SYSTEM,
      writability: MetadataWritability.SYSTEM,
    });

    const fields = Object.values(
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier,
    ).filter(isDefined);

    const shortLinkFieldNames = fields
      .filter((field) => field.objectMetadataId === shortLink?.id)
      .map((field) => field.name);

    expect(shortLinkFieldNames).toEqual(
      expect.arrayContaining([
        'authoredTemplateUrl',
        'resolvedDestinationUrl',
        'templateAndResolvedUrlHash',
      ]),
    );
  });

  it('uniquely indexes the authored template and resolved URL pair', () => {
    const index =
      allFlatEntityMaps.flatIndexMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.shortLink.indexes.templateAndResolvedUrlHashUniqueIndex
          .universalIdentifier
      ];

    expect(index).toMatchObject({ isUnique: true });
    expect(index?.flatIndexFieldMetadatas).toHaveLength(1);
    expect(index?.flatIndexFieldMetadatas[0].fieldMetadataId).toBe(
      allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier[
        STANDARD_OBJECTS.shortLink.fields.templateAndResolvedUrlHash
          .universalIdentifier
      ]?.id,
    );
  });
});
