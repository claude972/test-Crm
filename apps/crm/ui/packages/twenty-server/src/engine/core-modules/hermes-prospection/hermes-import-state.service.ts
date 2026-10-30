import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository, type EntityManager } from 'typeorm';

import { HermesImportStateEntity } from 'src/engine/core-modules/hermes-prospection/entities/hermes-import-state.entity';
import { HermesProspectionAccessService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service';
import {
  type HermesProspectionActor,
  type HermesProspectionState,
} from 'src/engine/core-modules/hermes-prospection/types/hermes-prospection.types';
import {
  emptyHermesProspectionState,
  HERMES_IMPORT_LIMITS,
} from 'src/engine/core-modules/hermes-prospection/utils/hermes-import-policy';

@Injectable()
export class HermesImportStateService {
  constructor(
    @InjectRepository(HermesImportStateEntity)
    private readonly states: Repository<HermesImportStateEntity>,
    private readonly access: HermesProspectionAccessService,
  ) {}

  async read(actor: HermesProspectionActor): Promise<HermesProspectionState> {
    await this.access.assertAllowed(actor);
    const record = await this.states.findOneBy({
      workspaceId: actor.workspaceId,
    });

    return record?.state ?? emptyHermesProspectionState();
  }

  async mutate<T>(
    actor: HermesProspectionActor,
    operation: (
      state: HermesProspectionState,
      manager: EntityManager,
    ) => Promise<T>,
  ): Promise<T> {
    await this.access.assertAllowed(actor);

    return this.states.manager.transaction(async (manager) => {
      const repository = manager.getRepository(HermesImportStateEntity);

      await repository
        .createQueryBuilder()
        .insert()
        .values({
          workspaceId: actor.workspaceId,
          state: emptyHermesProspectionState(),
        })
        .orIgnore()
        .execute();
      const record = await repository.findOneOrFail({
        where: { workspaceId: actor.workspaceId },
        lock: { mode: 'pessimistic_write' },
      });
      await this.access.assertAllowed(actor, manager);
      if (
        record.state.version !== 1 ||
        !Array.isArray(record.state.batches) ||
        !Array.isArray(record.state.campaignIds)
      ) {
        throw new ConflictException('IMPORT_STATE_VERSION_UNSUPPORTED');
      }
      const result = await operation(record.state, manager);

      if (
        Buffer.byteLength(JSON.stringify(record.state), 'utf8') >
        HERMES_IMPORT_LIMITS.stateBytes
      ) {
        throw new ConflictException('IMPORT_STORAGE_LIMIT_REACHED');
      }
      await repository.save(record);

      return result;
    });
  }
}
