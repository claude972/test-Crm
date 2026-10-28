import { KOVAALAB_PUBLIC_APP_UNIVERSAL_IDENTIFIERS } from 'src/engine/core-modules/application/application-marketplace/constants/kovaa-lab-public-app-universal-identifiers.constant';

export const MARKETPLACE_VETTED_APPLICATIONS: {
  universalIdentifier: string;
  sourcePackage: string;
  position?: number;
}[] = [
  {
    universalIdentifier: KOVAALAB_PUBLIC_APP_UNIVERSAL_IDENTIFIERS.CALL_RECORDER,
    sourcePackage: '@kovaa-lab/call-recorder',
    position: 1,
  },
  {
    universalIdentifier:
      KOVAALAB_PUBLIC_APP_UNIVERSAL_IDENTIFIERS.PEOPLE_DATA_LABS,
    sourcePackage: '@kovaa-lab/people-data-labs',
    position: 2,
  },
  {
    universalIdentifier: KOVAALAB_PUBLIC_APP_UNIVERSAL_IDENTIFIERS.LAST_CONTACT,
    sourcePackage: '@kovaa-lab/last-contact',
    position: 3,
  },
  {
    universalIdentifier: KOVAALAB_PUBLIC_APP_UNIVERSAL_IDENTIFIERS.EXA,
    sourcePackage: '@kovaa-lab/exa',
    position: 4,
  },
  {
    universalIdentifier: KOVAALAB_PUBLIC_APP_UNIVERSAL_IDENTIFIERS.SLACK,
    sourcePackage: '@kovaa-lab/slack',
    position: 5,
  },
  {
    universalIdentifier: KOVAALAB_PUBLIC_APP_UNIVERSAL_IDENTIFIERS.TEAMS,
    sourcePackage: '@kovaa-lab/teams',
    position: 6,
  },
];
