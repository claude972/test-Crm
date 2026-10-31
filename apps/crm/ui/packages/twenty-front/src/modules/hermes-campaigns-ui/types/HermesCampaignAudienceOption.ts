// One audience list, or one unsubscribe topic, offered as a choice.
//
// Both are chosen the same way and recorded on the campaign the same way, so
// they share a shape. Neither choice decides who will be written to: the
// server re-resolves the audience from the list it was given, under its own
// rights and its own suppressions.
export type HermesCampaignAudienceOption = {
  id: string;
  // Null when the server published no name. The row then says so rather than
  // rendering an empty line that reads like a defect.
  name: string | null;
  description: string | null;
};
