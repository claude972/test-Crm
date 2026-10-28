import { isNonEmptyString } from '@sniptt/guards';
import { ApiPath } from 'kovaa-lab-shared/types';
import { isAbsoluteUrl } from 'kovaa-lab-shared/utils';

export const buildPublicAssetLogoUrl = ({
  logo,
  serverUrl,
  workspaceId,
  applicationId,
}: {
  logo: string | null | undefined;
  serverUrl: string;
  workspaceId: string;
  applicationId: string;
}): string | null => {
  if (!isNonEmptyString(logo)) {
    return null;
  }

  if (isAbsoluteUrl(logo)) {
    return logo;
  }

  return `${serverUrl}/${ApiPath.PublicAssets}/${workspaceId}/${applicationId}/${logo}`;
};
