import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const allowRequestsToKovaaLab CRMIconsState = createAtomState<boolean>({
  key: 'allowRequestsToKovaaLab CRMIcons',
  defaultValue: true,
});
