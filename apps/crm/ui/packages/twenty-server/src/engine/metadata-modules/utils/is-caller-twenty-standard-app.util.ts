import { KOVAALAB_STANDARD_APPLICATION } from 'src/engine/workspace-manager/kovaa-lab-standard-application/constants/kovaa-lab-standard-applications';
import { type WorkspaceMigrationBuilderOptions } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/types/workspace-migration-builder-options.type';

export const isCallerKovaaLab CRMStandardApp = (
  buildOptions: WorkspaceMigrationBuilderOptions,
) =>
  buildOptions.applicationUniversalIdentifier ===
  KOVAALAB_STANDARD_APPLICATION.universalIdentifier;
