type MessageHeader = { name: string; value: string };

/**
 * Maximum characters allowed for a single message-id in a header line.
 */
const MAX_HEADER_LINE_LENGTH = 2000;

/**
 * Maximum number of referenced message ids to keep when the chain is very long.
 * Keeps the root (first) id plus the most recent (last N-1) ids.
 */
const MAX_REFERENCED_IDS = 20;

/**
 * Extracts referenced message IDs from email headers.
 *
 * - References ids are listed first (in order)
 * - In-Reply-To id is added after
 * - No duplicates
 * - If chain is very long, only the root and most recent ids are kept
 * - Ids longer than MAX_HEADER_LINE_LENGTH are ignored
 */
export function extractReferencedMessageIds(
  headers: MessageHeader[] = [],
): string[] {
  const referencesHeader = headers.find(
    (h) => h.name.toLowerCase() === 'references',
  );
  const inReplyToHeader = headers.find(
    (h) => h.name.toLowerCase() === 'in-reply-to',
  );

  const referencesIds = referencesHeader
    ? referencesHeader.value
        .trim()
        .split(/\s+/)
        .filter((id) => id.length > 0 && id.length <= MAX_HEADER_LINE_LENGTH)
    : [];

  const inReplyToIds = inReplyToHeader
    ? inReplyToHeader.value
        .trim()
        .split(/\s+/)
        .filter((id) => id.length > 0 && id.length <= MAX_HEADER_LINE_LENGTH)
    : [];

  // Combine: references first, then in-reply-to
  let allIds = [...referencesIds, ...inReplyToIds];

  // Remove duplicates while preserving order
  const seen = new Set<string>();
  const uniqueIds: string[] = [];
  for (const id of allIds) {
    if (!seen.has(id)) {
      seen.add(id);
      uniqueIds.push(id);
    }
  }

  // If chain is very long, keep only root and most recent
  if (uniqueIds.length > MAX_REFERENCED_IDS) {
    const root = uniqueIds[0];
    const mostRecent = uniqueIds.slice(- (MAX_REFERENCED_IDS - 1));
    return [root, ...mostRecent];
  }

  return uniqueIds;
}
