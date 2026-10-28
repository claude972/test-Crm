import { type RelationOnDeleteAction } from 'kovaa-lab-shared/types';

import { convertOnDeleteActionToOnDelete } from 'src/engine/workspace-manager/workspace-migration/utils/convert-on-delete-action-to-on-delete.util';

export const computeForeignKeyOnDelete = ({
  onDelete,
}: {
  onDelete: RelationOnDeleteAction | undefined;
}) => convertOnDeleteActionToOnDelete(onDelete) ?? 'CASCADE';
