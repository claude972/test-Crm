import { type Manifest } from 'kovaa-lab-shared/application';
import { type ExportedManifest } from '@/app/types/exported-manifest.type';

export const toPullManifest = (manifest: ExportedManifest): Manifest =>
  manifest as Manifest;
