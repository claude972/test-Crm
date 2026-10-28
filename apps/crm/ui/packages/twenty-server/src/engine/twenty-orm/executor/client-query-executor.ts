import { type PoolClient } from 'pg';

import { type CompiledStatement } from 'src/engine/kovaa-lab-orm/sql/utils/compile-named-parameters.util';
import { computeKovaaLab CRMOrmException } from 'src/engine/kovaa-lab-orm/error-handling/compute-kovaa-lab-orm-exception.util';
import { type QueryExecutor } from 'src/engine/kovaa-lab-orm/executor/types/query-executor.type';

export class ClientQueryExecutor implements QueryExecutor {
  private readonly client: PoolClient;

  constructor({ client }: { client: PoolClient }) {
    this.client = client;
  }

  async execute(
    statement: CompiledStatement,
  ): Promise<Record<string, unknown>[]> {
    try {
      const result = await this.client.query(statement);

      return result.rows as Record<string, unknown>[];
    } catch (error) {
      throw computeKovaaLab CRMOrmException(error);
    }
  }
}
