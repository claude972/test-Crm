import { type AttachmentFileCategory } from '@/activities/files/types/AttachmentFileCategory';
import { type FileCategory } from 'kovaa-lab-shared/types';
import { useTheme } from 'kovaa-lab-ui/theme';

export const useFileIconColors = (): Record<
  AttachmentFileCategory | FileCategory,
  string
> => {
  const theme = useTheme();

  return {
    ARCHIVE: theme.color.gray,
    AUDIO: theme.color.pink,
    IMAGE: theme.color.amber,
    PRESENTATION: theme.color.orange,
    SPREADSHEET: theme.color.turquoise,
    TEXT_DOCUMENT: theme.color.blue,
    VIDEO: theme.color.purple,
    OTHER: theme.color.gray,
  };
};
