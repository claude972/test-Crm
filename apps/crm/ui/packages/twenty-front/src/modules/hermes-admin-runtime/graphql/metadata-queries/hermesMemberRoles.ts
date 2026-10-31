import { gql } from '@apollo/client';

// The active company's roles with the permission flags that decide what their
// holders may do. The shared member fragment loaded at sign-in does not select
// `roles`, which is why every role read « inconnu »; that fragment belongs to
// other screens, so this module asks for what it needs. Leaner than the
// settings screen's own roles query, and the flags matter, not the label.
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
      workspaceMembers {
        id
      }
    }
  }
`;
