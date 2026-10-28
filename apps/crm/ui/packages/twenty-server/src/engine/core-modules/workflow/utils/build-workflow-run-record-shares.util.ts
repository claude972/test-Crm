import { EVERYONE_PRINCIPAL_ID } from 'kovaa-lab-shared/constants';
import {
  RecordShareAccessLevel,
  RecordSharePrincipalType,
  RecordShareRowCause,
} from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

import { type RecordShareInput } from 'src/engine/core-modules/record-share/types/record-share-input.type';

// must agree with buildCoreWorkflowVisibilitySqlPredicate
export const buildWorkflowRunRecordShares = ({
  objectMetadataId,
  workflowRunIds,
  isWorkspaceVisible,
  creatorWorkspaceMemberId,
}: {
  objectMetadataId: string;
  workflowRunIds: string[];
  isWorkspaceVisible: boolean;
  creatorWorkspaceMemberId: string | null;
}): RecordShareInput[] =>
  workflowRunIds.flatMap((workflowRunId) => [
    ...(isWorkspaceVisible
      ? [
          {
            objectMetadataId,
            recordId: workflowRunId,
            principalId: EVERYONE_PRINCIPAL_ID,
            principalType: RecordSharePrincipalType.EVERYONE,
            accessLevel: RecordShareAccessLevel.FULL,
            rowCause: RecordShareRowCause.RULE,
            sourceId: workflowRunId,
          },
        ]
      : []),
    ...(isDefined(creatorWorkspaceMemberId)
      ? [
          {
            objectMetadataId,
            recordId: workflowRunId,
            principalId: creatorWorkspaceMemberId,
            principalType: RecordSharePrincipalType.WORKSPACE_MEMBER,
            accessLevel: RecordShareAccessLevel.FULL,
            rowCause: RecordShareRowCause.OWNER,
            sourceId: workflowRunId,
          },
        ]
      : []),
  ]);
