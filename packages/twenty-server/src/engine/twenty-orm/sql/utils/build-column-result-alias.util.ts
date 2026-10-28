import { buildPostgresSafeAlias } from 'src/engine/kovaa-lab-orm/sql/utils/build-postgres-safe-alias.util';

export const buildColumnResultAlias = (
  alias: string,
  columnName: string,
): string => buildPostgresSafeAlias(`${alias}_${columnName}`);
