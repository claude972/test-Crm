import { type FileFolder } from 'kovaa-lab-shared/types';
import { isDefined, isValidUuid } from 'kovaa-lab-shared/utils';

export const extractFileIdFromUrl = (
  url: string,
  fileFolder: FileFolder,
): string | null => {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  const pathname = parsedUrl.pathname;
  const isLinkExternal = !pathname.startsWith(`/file/${fileFolder}/`);

  if (isLinkExternal) {
    return null;
  }

  const fileId = pathname.match(`/${fileFolder}/([^/]+)`)?.[1];

  return isDefined(fileId) && isValidUuid(fileId) ? fileId : null;
};
