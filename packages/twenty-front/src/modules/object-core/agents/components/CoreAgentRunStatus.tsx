import { t } from '@lingui/core/macro';
import { assertUnreachable } from 'kovaa-lab-shared/utils';
import { Status } from 'kovaa-lab-ui/primitives/data-display';

import { AgentTurnStatus } from '~/generated-metadata/graphql';

type CoreAgentRunStatusProps = {
  status: AgentTurnStatus;
};

export const CoreAgentRunStatus = ({ status }: CoreAgentRunStatusProps) => {
  switch (status) {
    case AgentTurnStatus.RUNNING:
      return (
        <Status color="blue" loading>
          {t`Running`}
        </Status>
      );
    case AgentTurnStatus.WAITING_FOR_INPUT:
      return <Status color="orange">{t`Waiting`}</Status>;
    case AgentTurnStatus.COMPLETED:
      return <Status color="green">{t`Done`}</Status>;
    case AgentTurnStatus.CANCELLED:
      return <Status color="gray">{t`Cancelled`}</Status>;
    case AgentTurnStatus.FAILED:
      return <Status color="red">{t`Failed`}</Status>;
    default:
      return assertUnreachable(status);
  }
};
