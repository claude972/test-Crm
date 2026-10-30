import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const allowRequestsToKovaaLabCRMIconsState = createAtomState<boolean>({
  key: 'allowRequestsToKovaaLabCRMIcons',
  defaultValue: true,
});
