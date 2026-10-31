import { gql } from '@apollo/client';

// The roles of the active operating company, with the permission flags that
// decide what their holders may actually do.
//
// Why this query exists at all: the shared member fragment the product loads
// at sign-in does not select `roles`, so every member's role came back
// undefined and the settings centre could only ever say « rôle inconnu ».
// That fragment is shared by other screens and is not this module's to change,
// so this module asks for what it needs itself.
//
// Deliberately leaner than the settings screen's own roles query: no agents,
// no API keys, no object, field or row-level permissions. Those are not needed
// to state a member's rights here, and a settings screen should not drag the
// whole permission graph into a members table.
//
// The flags are requested rather than the label alone because a label is a
// name somebody chose: « Administrateur » can carry nothing, and a custom role
// nobody recognises can be the one that configures the connections. Only the
// flags say what a role does.
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
