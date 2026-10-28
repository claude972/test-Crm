import { STANDARD_OBJECTS } from 'kovaa-lab-shared/metadata';
import { FieldMetadataType, MetadataWritability } from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

import { computeKovaaLab CRMStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/kovaa-lab-standard-application/utils/kovaa-lab-standard-application-all-flat-entity-maps.constant';

const WORKSPACE_ID = '20202020-1111-4111-8111-111111111111';
const KOVAALAB_STANDARD_APPLICATION_ID = '20202020-2222-4222-8222-222222222222';
const NOW = '2024-01-01T00:00:00.000Z';

describe('Standard field writability', () => {
  const { allFlatEntityMaps } =
    computeKovaaLab CRMStandardApplicationAllFlatEntityMaps({
      now: NOW,
      workspaceId: WORKSPACE_ID,
      kovaa-labStandardApplicationId: KOVAALAB_STANDARD_APPLICATION_ID,
    });

  const standardFlatFieldMetadatas = Object.values(
    allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier,
  ).filter(isDefined);

  const searchVectorFlatFieldMetadatas = standardFlatFieldMetadatas.filter(
    (flatFieldMetadata) =>
      flatFieldMetadata.type === FieldMetadataType.TS_VECTOR,
  );

  it('marks every search vector field as SYSTEM, since Postgres generates the column', () => {
    expect(searchVectorFlatFieldMetadatas.length).toBeGreaterThan(0);
    expect(
      searchVectorFlatFieldMetadatas.every(
        (flatFieldMetadata) =>
          flatFieldMetadata.writability === MetadataWritability.SYSTEM,
      ),
    ).toBe(true);
  });

  it('leaves fields outside protected history and search vectors OPEN', () => {
    const nonSearchVectorWritabilities = new Set(
      standardFlatFieldMetadatas
        .filter(
          (flatFieldMetadata) =>
            flatFieldMetadata.type !== FieldMetadataType.TS_VECTOR &&
            ![
              STANDARD_OBJECTS.agentChatThread.universalIdentifier,
              STANDARD_OBJECTS.agentMessage.universalIdentifier,
              STANDARD_OBJECTS.agentMessagePart.universalIdentifier,
              STANDARD_OBJECTS.agentMessageReaction.universalIdentifier,
              STANDARD_OBJECTS.agentTurn.universalIdentifier,
              STANDARD_OBJECTS.agentChatThreadParticipant.universalIdentifier,
              STANDARD_OBJECTS.campaignDelivery.universalIdentifier,
              STANDARD_OBJECTS.messageSuppression.universalIdentifier,
            ].some(
              (identifier) =>
                identifier ===
                flatFieldMetadata.objectMetadataUniversalIdentifier,
            ),
        )
        .map((flatFieldMetadata) => flatFieldMetadata.writability),
    );

    expect([...nonSearchVectorWritabilities]).toEqual([
      MetadataWritability.OPEN,
    ]);
  });
});
