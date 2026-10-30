// Page sizes stay under QUERY_MAX_RECORDS (200), which the generic record API
// enforces server side.
export const PROSPECTION_RECEIVED_LISTS_PAGE_SIZE = 30;

// Members read in one page on the qualification screen. More are fetched on
// demand, and every figure says which rows it covers.
export const PROSPECTION_LIST_MEMBERS_PAGE_SIZE = 60;

// Members read once across the lists shown on the reception screen, to count
// them per list without one query per row.
export const PROSPECTION_LISTS_MEMBERS_SCAN_LIMIT = 200;

// Companies resolved for the members on screen, in one extra page.
export const PROSPECTION_COMPANIES_SCAN_LIMIT = 200;

// The opt-out register is read in one page. FindMessageSuppressionsInput caps
// limit at 100, so beyond that the register is only partly known and an
// address missing from it cannot be called reachable.
export const PROSPECTION_OPPOSITION_SCAN_LIMIT = 100;
