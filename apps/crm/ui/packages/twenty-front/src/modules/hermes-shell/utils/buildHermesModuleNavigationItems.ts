import { MESSAGING_INBOX_PATH } from '@/messaging-inbox/constants/MessagingInboxRoutePaths';
import {
  HERMES_ADMIN_RUNTIME_PATH,
  HERMES_MAILBOX_RUNTIME_PATH,
  HERMES_WA_RUNTIME_PATH,
} from '@/hermes-shell/constants/HermesRuntimeRoutePaths';
import { PROSPECTION_RECEPTION_PATH } from '@/prospection/constants/ProspectionRoutePaths';
import { HERMES_SHELL_ROUTE_PATHS } from '@/hermes-shell/constants/HermesShellRoutePaths';

export type HermesModuleNavigationItem = {
  key:
    | 'dashboard'
    | 'reception'
    | 'messaging'
    | 'whatsapp'
    | 'mailbox'
    | 'connections';
  to: string;
  isActive: boolean;
};

type BuildHermesModuleNavigationItemsParams = {
  hasWorkspacePermission: boolean;
  pathname: string;
};

// Which Hermes modules the existing drawer offers, kept out of the component
// so the rule can be tested without providers.
//
// Dashboard is unconditional on purpose. It lives outside this drawer, under
// its own shell, so it is the only way back to the Hermes space from a record
// page — gating it would leave someone with no route but a typed URL. It
// grants nothing: the page reports what the session may already read.
//
// Reception is gated, because its operations are restricted server side to
// unrestricted workspace administrators and everyone else is refused. A link
// that only ever leads to a refusal is worse than no link.
export const buildHermesModuleNavigationItems = ({
  hasWorkspacePermission,
  pathname,
}: BuildHermesModuleNavigationItemsParams): HermesModuleNavigationItem[] => {
  const items: HermesModuleNavigationItem[] = [
    {
      key: 'dashboard',
      to: HERMES_SHELL_ROUTE_PATHS.operationsDashboard,
      isActive: pathname === HERMES_SHELL_ROUTE_PATHS.operationsDashboard,
    },
  ];

  if (hasWorkspacePermission) {
    // Same gate as the reception: the inbox operations are restricted server
    // side to unrestricted workspace administrators, and a link that only ever
    // leads to a refusal is worse than no link.
    items.push({
      key: 'messaging',
      to: MESSAGING_INBOX_PATH,
      // startsWith, so an opened conversation carried in the search parameters
      // keeps the section marked as current.
      isActive: pathname.startsWith(MESSAGING_INBOX_PATH),
    });

    items.push({
      key: 'whatsapp',
      to: HERMES_WA_RUNTIME_PATH,
      isActive: pathname.startsWith(HERMES_WA_RUNTIME_PATH),
    });

    items.push({
      key: 'mailbox',
      to: HERMES_MAILBOX_RUNTIME_PATH,
      isActive: pathname.startsWith(HERMES_MAILBOX_RUNTIME_PATH),
    });

    items.push({
      key: 'connections',
      to: HERMES_ADMIN_RUNTIME_PATH,
      isActive: pathname.startsWith(HERMES_ADMIN_RUNTIME_PATH),
    });

    items.push({
      key: 'reception',
      to: PROSPECTION_RECEPTION_PATH,
      // startsWith, so a batch opened through the search parameter and the
      // campaign-audience pages keep the section marked as current.
      isActive: pathname.startsWith(PROSPECTION_RECEPTION_PATH),
    });
  }

  return items;
};
