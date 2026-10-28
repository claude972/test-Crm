import { EMAIL_IMAGE_MIME_TYPES } from 'kovaa-lab-shared/constants';

export const isImageFile = (file: File) =>
  EMAIL_IMAGE_MIME_TYPES.some((mimeType) => mimeType === file.type);
