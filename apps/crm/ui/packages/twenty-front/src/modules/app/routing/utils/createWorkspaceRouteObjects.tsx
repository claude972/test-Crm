import { lazy } from 'react';
import { AppPath } from 'kovaa-lab-shared/types';

import { LazyRoute } from '@/app/components/LazyRoute';
import {
  createSettingsRouteObjects,
  SettingsRouteOutlet,
} from '@/app/components/SettingsRoutes';
import { type WorkspaceRouteObject } from '@/app/routing/types/WorkspaceRouteObject';
import { MESSAGING_INBOX_PATH } from '@/messaging-inbox/constants/MessagingInboxRoutePaths';
import {
  HERMES_ADMIN_RUNTIME_PATH,
  HERMES_CAMPAIGN_LIST_PATH,
  HERMES_CAMPAIGN_RUNTIME_PATH,
  HERMES_MAILBOX_RUNTIME_PATH,
  HERMES_WA_RUNTIME_PATH,
} from '@/hermes-shell/constants/HermesRuntimeRoutePaths';
import {
  PROSPECTION_CAMPAIGN_AUDIENCE_PATH,
  PROSPECTION_RECEPTION_PATH,
} from '@/prospection/constants/ProspectionRoutePaths';
import { RecordIndexSkeletonLoader } from '@/object-record/record-index/components/RecordIndexSkeletonLoader';

const AgentCoreIndexPage = lazy(() =>
  import('~/pages/object-core/AgentCoreIndexPage').then((module) => ({
    default: module.AgentCoreIndexPage,
  })),
);

const AgentCoreShowPage = lazy(() =>
  import('~/pages/object-core/AgentCoreShowPage').then((module) => ({
    default: module.AgentCoreShowPage,
  })),
);

const WorkflowCoreShowPage = lazy(() =>
  import('~/pages/object-core/WorkflowCoreShowPage').then((module) => ({
    default: module.WorkflowCoreShowPage,
  })),
);

const RecordIndexPage = lazy(() =>
  import('~/pages/object-record/RecordIndexPage').then((module) => ({
    default: module.RecordIndexPage,
  })),
);

const RecordShowPage = lazy(() =>
  import('~/pages/object-record/RecordShowPage').then((module) => ({
    default: module.RecordShowPage,
  })),
);

const StandalonePageLayoutPage = lazy(() =>
  import('~/pages/page-layout/StandalonePageLayoutPage').then((module) => ({
    default: module.StandalonePageLayoutPage,
  })),
);

const AiChatPage = lazy(() =>
  import('~/pages/ai-chat/AiChatPage').then((module) => ({
    default: module.AiChatPage,
  })),
);

const AiChatInboxPage = lazy(() =>
  import('~/pages/ai-chat/AiChatInboxPage').then((module) => ({
    default: module.AiChatInboxPage,
  })),
);

const MobileHomePage = lazy(() =>
  import('~/pages/mobile-home/MobileHomePage').then((module) => ({
    default: module.MobileHomePage,
  })),
);

const ProspectionImportBatchesPage = lazy(() =>
  import('~/pages/prospection/ProspectionImportBatchesPage').then((module) => ({
    default: module.ProspectionImportBatchesPage,
  })),
);

const ProspectionCampaignAudiencePage = lazy(() =>
  import('~/pages/prospection/ProspectionCampaignAudiencePage').then(
    (module) => ({ default: module.ProspectionCampaignAudiencePage }),
  ),
);

// One route: the channel tab and the opened conversation are search
// parameters, so a thread reloads and shares without a route parameter.
const HermesWaRuntimePage = lazy(() =>
  import('~/pages/hermes/HermesWaRuntimePage').then((module) => ({
    default: module.HermesWaRuntimePage,
  })),
);

const HermesMailboxRuntimePage = lazy(() =>
  import('~/pages/hermes/HermesMailboxRuntimePage').then((module) => ({
    default: module.HermesMailboxRuntimePage,
  })),
);

const HermesAdminRuntimePage = lazy(() =>
  import('~/pages/hermes/HermesAdminRuntimePage').then((module) => ({
    default: module.HermesAdminRuntimePage,
  })),
);

const HermesCampaignListPage = lazy(() =>
  import('~/pages/hermes/HermesCampaignListPage').then((module) => ({
    default: module.HermesCampaignListPage,
  })),
);

const HermesCampaignRuntimePage = lazy(() =>
  import('~/pages/hermes/HermesCampaignRuntimePage').then((module) => ({
    default: module.HermesCampaignRuntimePage,
  })),
);

const MessagingInboxPage = lazy(() =>
  import('~/pages/messaging/MessagingInboxPage').then((module) => ({
    default: module.MessagingInboxPage,
  })),
);

const NotFound = lazy(() =>
  import('~/pages/not-found/NotFound').then((module) => ({
    default: module.NotFound,
  })),
);

type CreateWorkspaceRouteObjectsArgs = {
  isAdminPageEnabled?: boolean;
};

const MAIN_AND_SIDE_PANEL = ['main', 'side-panel'] as const;
const SETTINGS_ROOT_PATH = AppPath.SettingsCatchAll.replace('/*', '');

export const createWorkspaceRouteObjects = ({
  isAdminPageEnabled,
}: CreateWorkspaceRouteObjectsArgs): WorkspaceRouteObject[] => {
  const settingsRouteObjects = createSettingsRouteObjects({
    isAdminPageEnabled,
  });

  return [
    {
      path: AppPath.WorkflowCoreShowPage,
      element: (
        <LazyRoute>
          <WorkflowCoreShowPage />
        </LazyRoute>
      ),
      handle: {
        workspaceSurfaces: MAIN_AND_SIDE_PANEL,
        isLocationExpandableFromSidePanel: true,
      },
    },
    {
      path: AppPath.AgentIndexPage,
      element: (
        <LazyRoute fallback={<RecordIndexSkeletonLoader />}>
          <AgentCoreIndexPage />
        </LazyRoute>
      ),
    },
    {
      path: AppPath.AgentShowPage,
      element: (
        <LazyRoute>
          <AgentCoreShowPage />
        </LazyRoute>
      ),
    },
    {
      path: AppPath.Index,
      element: <RecordIndexSkeletonLoader />,
    },
    {
      path: AppPath.RecordIndexPage,
      element: (
        <LazyRoute fallback={<RecordIndexSkeletonLoader />}>
          <RecordIndexPage />
        </LazyRoute>
      ),
      handle: {
        workspaceSurfaces: MAIN_AND_SIDE_PANEL,
        isLocationExpandableFromSidePanel: true,
      },
    },
    {
      path: AppPath.RecordShowPage,
      element: (
        <LazyRoute>
          <RecordShowPage />
        </LazyRoute>
      ),
      handle: { workspaceSurfaces: MAIN_AND_SIDE_PANEL },
    },
    {
      path: AppPath.PageLayoutPage,
      element: (
        <LazyRoute>
          <StandalonePageLayoutPage />
        </LazyRoute>
      ),
    },
    {
      path: AppPath.AiChat,
      element: (
        <LazyRoute>
          <AiChatPage />
        </LazyRoute>
      ),
    },
    {
      path: AppPath.AiChatInbox,
      element: (
        <LazyRoute>
          <AiChatInboxPage />
        </LazyRoute>
      ),
    },
    {
      path: AppPath.Home,
      element: (
        <LazyRoute>
          <MobileHomePage />
        </LazyRoute>
      ),
    },
    {
      path: PROSPECTION_RECEPTION_PATH,
      element: (
        <LazyRoute>
          <ProspectionImportBatchesPage />
        </LazyRoute>
      ),
    },
    {
      path: PROSPECTION_CAMPAIGN_AUDIENCE_PATH,
      element: (
        <LazyRoute>
          <ProspectionCampaignAudiencePage />
        </LazyRoute>
      ),
    },
    {
      path: MESSAGING_INBOX_PATH,
      element: (
        <LazyRoute>
          <MessagingInboxPage />
        </LazyRoute>
      ),
    },
    {
      path: HERMES_WA_RUNTIME_PATH,
      element: (
        <LazyRoute>
          <HermesWaRuntimePage />
        </LazyRoute>
      ),
    },
    {
      path: HERMES_MAILBOX_RUNTIME_PATH,
      element: (
        <LazyRoute>
          <HermesMailboxRuntimePage />
        </LazyRoute>
      ),
    },
    {
      path: HERMES_ADMIN_RUNTIME_PATH,
      element: (
        <LazyRoute>
          <HermesAdminRuntimePage />
        </LazyRoute>
      ),
    },
    {
      path: HERMES_CAMPAIGN_LIST_PATH,
      element: (
        <LazyRoute>
          <HermesCampaignListPage />
        </LazyRoute>
      ),
    },
    {
      path: HERMES_CAMPAIGN_RUNTIME_PATH,
      element: (
        <LazyRoute>
          <HermesCampaignRuntimePage />
        </LazyRoute>
      ),
    },
    {
      path: SETTINGS_ROOT_PATH,
      element: <SettingsRouteOutlet />,
      children: settingsRouteObjects,
    },
    {
      path: AppPath.Dpa,
      element: null,
    },
    {
      path: AppPath.NotFoundWildcard,
      element: (
        <LazyRoute>
          <NotFound />
        </LazyRoute>
      ),
    },
  ];
};
