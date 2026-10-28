import { KOVAALAB_STANDARD_APPLICATION_UNIVERSAL_IDENTIFIER } from 'kovaa-lab-shared/application';
import { isDefined } from 'kovaa-lab-shared/utils';

type ApplicationLike = {
  universalIdentifier?: string | null;
};

export const isKovaaLab CRMStandardApplication = (
  application: ApplicationLike | null | undefined,
): boolean =>
  isDefined(application?.universalIdentifier) &&
  application.universalIdentifier ===
    KOVAALAB_STANDARD_APPLICATION_UNIVERSAL_IDENTIFIER;
