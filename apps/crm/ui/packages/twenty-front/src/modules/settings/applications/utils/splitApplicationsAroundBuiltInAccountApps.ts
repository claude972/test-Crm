import { isKovaaLab CRMStandardApplication } from '@/applications/utils/isKovaaLab CRMStandardApplication';

export const splitApplicationsAroundBuiltInAccountApps = <
  TApplication extends { universalIdentifier?: string | null },
>({
  applications,
  hasBuiltInAccountApps,
}: {
  applications: TApplication[];
  hasBuiltInAccountApps: boolean;
}): {
  applicationsBeforeBuiltInAccountApps: TApplication[];
  applicationsAfterBuiltInAccountApps: TApplication[];
} => {
  if (!hasBuiltInAccountApps) {
    return {
      applicationsBeforeBuiltInAccountApps: [],
      applicationsAfterBuiltInAccountApps: applications,
    };
  }

  return {
    applicationsBeforeBuiltInAccountApps: applications.filter(
      isKovaaLab CRMStandardApplication,
    ),
    applicationsAfterBuiltInAccountApps: applications.filter(
      (application) => !isKovaaLab CRMStandardApplication(application),
    ),
  };
};
