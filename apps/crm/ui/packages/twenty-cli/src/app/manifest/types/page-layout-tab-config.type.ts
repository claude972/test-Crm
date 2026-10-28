import { type PageLayoutTabManifest } from 'kovaa-lab-shared/application';

export type PageLayoutTabConfig = Omit<
  PageLayoutTabManifest,
  'pageLayoutUniversalIdentifier'
> & {
  pageLayoutUniversalIdentifier: string;
};
