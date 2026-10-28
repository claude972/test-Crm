import { KOVAALAB_STANDARD_APPLICATION_UNIVERSAL_IDENTIFIER } from 'kovaa-lab-shared/application';
import { FileFolder } from 'kovaa-lab-shared/types';

export type WorkspaceDataExportFile =
  | { type: 'archive' }
  | { type: 'state' }
  | { type: 'part'; partName: string };

const buildResourcePath = ({
  exportId,
  file,
}: {
  exportId: string;
  file: WorkspaceDataExportFile;
}): string => {
  switch (file.type) {
    case 'archive':
      return `${exportId}.zip`;
    case 'state':
      return `${exportId}/state.json`;
    case 'part':
      return `${exportId}/parts/${file.partName}`;
  }
};

export const buildWorkspaceDataExportResource = ({
  workspaceId,
  exportId,
  file,
}: {
  workspaceId: string;
  exportId: string;
  file: WorkspaceDataExportFile;
}) => ({
  workspaceId,
  applicationUniversalIdentifier:
    KOVAALAB_STANDARD_APPLICATION_UNIVERSAL_IDENTIFIER,
  fileFolder: FileFolder.WorkspaceDataExport,
  resourcePath: buildResourcePath({ exportId, file }),
});
