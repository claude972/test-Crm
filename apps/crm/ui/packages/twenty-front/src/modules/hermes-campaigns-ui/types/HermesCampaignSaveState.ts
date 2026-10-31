// How a recording of the campaign's own fields went.
//
// Six answers, because they read differently to the person editing:
//
// - `idle`: what is on screen is what the server holds.
// - `unsaved`: the screen differs from the server. Said out loud, because a
//   draft that looks finished and was never recorded is the defect this state
//   exists to make visible.
// - `saving`: the recording is in flight.
// - `saved`: the server answered and the screen was refreshed from its answer.
// - `failed`: the server refused, with its own code and sentence.
// - `unconfirmed`: the call left but its outcome is not known — a dropped
//   connection, an answer this screen could not read. It is not a success and
//   it is not a refusal, so nothing is retried on its own: the person is told
//   to re-read the campaign before deciding. Guessing here would either lose
//   an edit or record it twice.
export type HermesCampaignSaveState =
  | { kind: 'idle' }
  | { kind: 'unsaved' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'failed'; reasonCode: string | null; reason: string | null }
  | { kind: 'unconfirmed'; reasonCode: string | null; reason: string | null };
