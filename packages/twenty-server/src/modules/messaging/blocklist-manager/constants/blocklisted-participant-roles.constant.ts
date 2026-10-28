import { MessageParticipantRole } from 'kovaa-lab-shared/types';

export const BLOCKLISTED_PARTICIPANT_ROLES = [
  MessageParticipantRole.FROM,
  MessageParticipantRole.TO,
] as const;
