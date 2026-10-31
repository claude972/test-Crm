import { type HermesCampaignState } from '@/hermes-campaigns-ui/types/HermesCampaignJourney';

// One row of the campaigns list.
//
// Every figure is nullable because the server may publish none, and a missing
// figure is shown as unknown rather than as zero: a campaign whose sent count
// was not published has not been proven to have sent nothing.
export type HermesCampaignListEntry = {
  id: string;
  // Null when the campaign carries no name. The row then says so rather than
  // rendering an empty cell that reads like a defect.
  name: string | null;
  subject: string | null;
  // Null when the published status was not one of the states of the contract.
  // The raw string travels in `unknownStatus` so the row can name what it
  // received instead of inventing a state.
  state: HermesCampaignState | null;
  unknownStatus: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string | null;
  sentCount: number | null;
  failedCount: number | null;
};
