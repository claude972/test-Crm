// Literal paths rather than an AppPath entry: AppPath lives in
// kovaa-lab-shared, which this module does not own. Both prospection pages and
// the route table read these, so the two cannot drift apart.
export const PROSPECTION_RECEIVED_LISTS_PATH = '/prospection';

export const PROSPECTION_LIST_QUALIFICATION_PATH =
  '/prospection/lists/:messageListId';

export const getProspectionListQualificationPath = (messageListId: string) =>
  `/prospection/lists/${messageListId}`;
