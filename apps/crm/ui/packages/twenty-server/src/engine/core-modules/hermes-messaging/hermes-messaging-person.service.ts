import { Injectable } from '@nestjs/common';
import { FieldMetadataType } from 'kovaa-lab-shared/types';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import {
  type HermesMessagingActor,
  type HermesMessagingChannel,
} from 'src/engine/core-modules/hermes-messaging/types/hermes-messaging.types';
import { type PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { addPersonHandleFiltersToQueryBuilder } from 'src/modules/match-participant/person-handle-field/utils/add-person-handle-filters-to-query-builder.util';

@Injectable()
export class HermesMessagingPersonService {
  constructor(
    private readonly orm: WorkspaceOrmManager,
    private readonly roles: UserRoleService,
  ) {}
  // Only called after fresh unrestricted administrator authorization; never creates/merges contacts.
  async match(
    actor: HermesMessagingActor,
    channel: HermesMessagingChannel,
    handle: string,
  ): Promise<{ personId: string | null; personMatchStatus: string }> {
    if (channel === 'WHATSAPP' && !/^\d+@s\.whatsapp\.net$/.test(handle))
      return { personId: null, personMatchStatus: 'UNMATCHED' };
    try {
      const roleId = await this.roles.getRoleIdForUserWorkspace({
        workspaceId: actor.workspaceId,
        userWorkspaceId: actor.userWorkspaceId,
      });
      return await this.orm.executeInWorkspaceContext(async () => {
        const query = this.orm
          .getRepository<PersonWorkspaceEntity>('person', {
            intersectionOf: { userWorkspaceRoleId: roleId },
          })
          .createQueryBuilder('person');
        const people = await addPersonHandleFiltersToQueryBuilder({
          queryBuilder: query,
          personHandleField: {
            name: channel === 'EMAIL' ? 'emails' : 'phones',
            type:
              channel === 'EMAIL'
                ? FieldMetadataType.EMAILS
                : FieldMetadataType.PHONES,
          },
          handles: [channel === 'EMAIL' ? handle : `+${handle.split('@')[0]}`],
        })
          .take(3)
          .getMany();
        if (people.length === 1 && !people[0].deletedAt)
          return { personId: people[0].id, personMatchStatus: 'MATCHED' };
        return {
          personId: null,
          personMatchStatus: people.length > 0 ? 'AMBIGUOUS' : 'UNMATCHED',
        };
      }, buildSystemAuthContext(actor.workspaceId));
    } catch {
      return { personId: null, personMatchStatus: 'UNAVAILABLE' };
    }
  }
}
