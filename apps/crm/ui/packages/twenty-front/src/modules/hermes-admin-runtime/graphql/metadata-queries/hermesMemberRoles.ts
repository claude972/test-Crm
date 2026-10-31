import { gql } from '@apollo/client';

// The active company's roles with the facts the server's own gate checks: the
// three unrestricted flags AND the restriction lists it refuses outright. The
// shared member fragment loaded at sign-in selects no `roles` at all, and it
// belongs to other screens, so this module asks for what it needs. The
// restrictions are selected as ids only — just their presence is needed.
export const HERMES_MEMBER_ROLES = gql`
  query HermesMemberRoles {
    getRoles {
      id
      label
      canUpdateAllSettings
      canReadAllObjectRecords
      canUpdateAllObjectRecords
      canSoftDeleteAllObjectRecords
      canDestroyAllObjectRecords
      canAccessAllTools
      fieldPermissions {
        id
      }
      rowLevelPermissionPredicates {
        id
      }
      rowLevelPermissionPredicateGroups {
        id
      }
      workspaceMembers {
        id
      }
    }
  }
`;
