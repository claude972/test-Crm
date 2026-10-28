import { STANDARD_OBJECTS } from 'kovaa-lab-shared/metadata';
import { isDefined } from 'kovaa-lab-shared/utils';

export const hasTimelineActivityObjectMetadata = ({
  byUniversalIdentifier,
}: {
  byUniversalIdentifier: Partial<Record<string, unknown>>;
}): boolean =>
  isDefined(
    byUniversalIdentifier[
      STANDARD_OBJECTS.timelineActivity.universalIdentifier
    ],
  );
