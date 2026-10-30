import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const isSameOriginMultiWorkspaceEnabledState = createAtomState<boolean>({
  key: 'isSameOriginMultiWorkspaceEnabled',
  defaultValue: false,
});
