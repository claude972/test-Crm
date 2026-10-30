// Literal paths rather than an AppPath entry: AppPath lives in
// kovaa-lab-shared, which this module does not own. Both prospection pages and
// the route table read these, so the two cannot drift apart.

// The Hermes reception: incoming import batches, their rows and their statuses.
export const PROSPECTION_RECEPTION_PATH = '/prospection';

// One already-qualified campaign audience, read from messageList.
export const PROSPECTION_CAMPAIGN_AUDIENCE_PATH =
  '/prospection/campaign-audiences/:messageListId';

export const getProspectionCampaignAudiencePath = (messageListId: string) =>
  `/prospection/campaign-audiences/${messageListId}`;

// A batch is opened on the reception screen itself, through a search
// parameter: another route would mean editing the route table, which this
// module does not own.
export const PROSPECTION_IMPORT_BATCH_SEARCH_PARAM = 'batch';

export const getProspectionImportBatchPath = (batchId: string) =>
  `${PROSPECTION_RECEPTION_PATH}?${PROSPECTION_IMPORT_BATCH_SEARCH_PARAM}=${encodeURIComponent(batchId)}`;
