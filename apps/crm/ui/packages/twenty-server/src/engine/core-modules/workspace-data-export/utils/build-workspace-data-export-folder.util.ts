import { KOVAALAB_STANDARD_APPLICATION_UNIVERSAL_IDENTIFIER } from 'kovaa-lab-shared/application';
import { FileFolder } from 'kovaa-lab-shared/types';

export const buildWorkspaceDataExportFolder = ({
  workspaceId,
  exportId,
  folder,
}: {
  workspaceId: string;
  exportId: string;
  folder: 'export' | 'parts';
}) => ({
  workspaceId,
  applicationUniversalIdentifier:
    KOVAALAB_STANDARD_APPLICATION_UNIVERSAL_IDENTIFIER,
  fileFolder: FileFolder.WorkspaceDataExport,
  folderPath: folder === 'parts' ? `${exportId}/parts` : exportId,
});
