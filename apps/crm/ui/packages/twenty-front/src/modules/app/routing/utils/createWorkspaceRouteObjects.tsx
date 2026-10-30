import { lazy } from 'react';
import { AppPath } from 'kovaa-lab-shared/types';

import { LazyRoute } from '@/app/components/LazyRoute';
import {
  createSettingsRouteObjects,
  SettingsRouteOutlet,
} from '@/app/components/SettingsRoutes';
import { type WorkspaceRouteObject } from '@/app/routing/types/WorkspaceRouteObject';
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
