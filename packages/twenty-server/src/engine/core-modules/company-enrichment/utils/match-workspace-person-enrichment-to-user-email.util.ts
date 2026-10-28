import { isDefined } from 'kovaa-lab-shared/utils';
import { type WorkspacePersonEnrichment } from 'kovaa-lab-shared/workspace';

export const matchWorkspacePersonEnrichmentToUserEmail = ({
  personEnrichment,
  userEmail,
}: {
  personEnrichment: WorkspacePersonEnrichment | null;
  userEmail: string;
}): WorkspacePersonEnrichment | null =>
  isDefined(personEnrichment) &&
  personEnrichment.email.toLowerCase() === userEmail.trim().toLowerCase()
    ? personEnrichment
    : null;
