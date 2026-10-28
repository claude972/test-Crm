import {
  CalendarChannelVisibility,
  MessageChannelVisibility,
} from 'kovaa-lab-shared/types';

export type APIsOAuthState = {
  transientToken?: string;
  redirectLocation?: string;
  calendarVisibility?: CalendarChannelVisibility;
  messageVisibility?: MessageChannelVisibility;
  skipMessageChannelConfiguration?: boolean;
};
