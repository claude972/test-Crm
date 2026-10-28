import { INTERNAL_CREDITS_PER_DISPLAY_CREDIT } from 'kovaa-lab-shared/constants';

export const toDisplayCredits = (internalCredits: number): number =>
  internalCredits / INTERNAL_CREDITS_PER_DISPLAY_CREDIT;
