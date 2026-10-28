export const logger = {
  log: () => {},
  error: () => {},
  debug: () => {},
  warn: () => {}
};
export const isDefined = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;
export const isNonEmptyArray = <T>(value: readonly T[] | null | undefined): value is T[] =>
  Array.isArray(value) && value.length > 0;
export const isValidUuid = (
  value: string | null | undefined
): boolean =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const assertUnreachable = (value: never): never => {
  throw new Error(`Unexpected value: ${String(value)}`);
};
export const formatEmailAddress = (
  email: { name?: string | null; email?: string | null } | null | undefined
): string => {
  if (!email || !email.email) {
    return '';
  }
  const name = (email.name ?? '').trim();
  if (name) {
    return `${name} <${email.email}>`;
  }
  return email.email;
};
export const parseEmailAddressList = (
  list: string | null | undefined
): { name: string; email: string }[] => {
  if (!list) {
    return [];
  }
  return list
    .split(',')
    .map((entry) => {
      const trimmed = entry.trim();
      const match = trimmed.match(/^("?(?:[^"<]|\.|"(?:[^"\\]|\\.)*)"?)\s*<([^>]+)>$/);
      if (match) {
        const name = match[1].replace(/^"|"$/g, '');
        return { name, email: match[2].trim() };
      }
      return { name: '', email: trimmed };
    })
    .filter((entry) => entry.email.length > 0);
};
export const parseToInstantOrThrow = (
  value: string | Date | number | null | undefined
): Date => {
  const date = value instanceof Date ? value : new Date(value as any);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${String(value)}`);
  }
  return date;
};
export const getSendableEmailHandles = (
  connectedAccount:
    | { email?: string | null; emailAddresses?: string[] | null }
    | null
    | undefined
): { email: string }[] => {
  if (!connectedAccount) {
    return [];
  }
  const emails = Array.isArray(connectedAccount.emailAddresses)
    ? connectedAccount.emailAddresses
    : connectedAccount.email
      ? [connectedAccount.email]
      : [];
  return emails.filter((email) => !!email).map((email) => ({ email }));
};
