import { doNotTranslate } from 'kovaa-lab-shared/i18n';

import { REACT_APP_SERVER_BASE_URL } from '~/config';

export const KOVAALAB_CLI_LOGIN_COMMAND = doNotTranslate(
  `npx kovaa-lab@latest auth login --url ${REACT_APP_SERVER_BASE_URL} --use`,
);
