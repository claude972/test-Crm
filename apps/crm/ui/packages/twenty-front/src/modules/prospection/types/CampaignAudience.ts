// Shape read from the messageList standard object: an audience list already
// qualified for campaigns, not an incoming batch. The object carries no import
// origin, no legal basis and no collection date, so none is declared here: a
// field absent from the model must not appear as a typed promise.
export type CampaignAudience = {
  id: string;
  name: string | null;
  description: string | null;
  createdAt: string | null;
  __typename: string;
};
