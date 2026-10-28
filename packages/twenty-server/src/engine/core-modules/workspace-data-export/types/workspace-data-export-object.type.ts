import { type RecordExportColumn } from 'kovaa-lab-shared/types';

export type WorkspaceDataExportObject = {
  objectMetadataId: string;
  nameSingular: string;
  labelSingular: string;
  columns: RecordExportColumn[];
  fieldCount: number;
};
