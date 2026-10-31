// One recipient the operator can ask a preview for.
//
// A per-recipient preview needs a named recipient. Rendering "the first one"
// or "a typical contact" would answer a question nobody asked: the operator
// wants to know what a given person receives, variables resolved against
// that person's record.
export type HermesCampaignPreviewRecipient = {
  // The person's own id, which is what the preview operation is asked for.
  // Deliberately not the list-membership id and never an index in a list: a
  // list that reorders would move the choice with it, and a membership id
  // would not identify the person the render resolves variables against.
  id: string;
  // How to name this recipient on screen. Null when the server published no
  // readable name, which renders as the address alone rather than as a
  // guessed name.
  label: string | null;
  address: string | null;
};
