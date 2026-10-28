import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';
import { type FullNameMetadata } from 'kovaa-lab-shared/types';

export const onboardingCreateProfileDraftState =
  createAtomState<FullNameMetadata | null>({
    key: 'onboardingCreateProfileDraftState',
    defaultValue: null,
  });
