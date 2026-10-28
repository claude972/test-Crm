import { type Pool } from 'pg';

import { type CompiledStatement } from 'src/engine/kovaa-lab-orm/sql/utils/compile-named-parameters.util';
import { computeKovaaLab CRMOrmException } from 'src/engine/kovaa-lab-orm/error-handling/compute-kovaa-lab-orm-exception.util';
import { type QueryExecutor } from 'src/engine/kovaa-lab-orm/executor/types/query-executor.type';

export class PoolQueryExecutor implements QueryExecutor {
  private readonly pool: Pool;

  constructor({ pool }: { pool: Pool }) {
    this.pool = pool;
  }

  async execute(
    statement: CompiledStatement,
  ): Promise<Record<string, unknown>[]> {
    try {
      const result = await this.pool.query(statement);

      return result.rows as Record<string, unknown>[];
    } catch (error) {
      throw computeKovaaLab CRMOrmException(error);
    }
  }
}
