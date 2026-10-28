import {
  type ConnectedAccountEmailFields,
  EmailOperation,
} from 'kovaa-lab-shared/types';
import { canConnectedAccountPerformEmailOperation } from 'kovaa-lab-shared/utils';

export const findFirstConnectedAccountAbleToSendEmail = <
  TConnectedAccount extends ConnectedAccountEmailFields,
>(
  connectedAccounts: TConnectedAccount[],
): TConnectedAccount | null =>
  connectedAccounts.find((connectedAccount) =>
    canConnectedAccountPerformEmailOperation({
      connectedAccount,
      operation: EmailOperation.SEND,
    }),
  ) ?? null;
