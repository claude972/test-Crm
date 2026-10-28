import { type CommandConfirmationModalResult } from 'kovaa-lab-sdk/front-component';

export type CommandConfirmationModalPromiseCallbacks = {
  resolve: (result: CommandConfirmationModalResult) => void;
  reject: (error: Error) => void;
};
