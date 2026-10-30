import { type ComponentProps } from 'react';
import 'kovaa-lab-ui/style.css';
import { ThemeProvider } from 'kovaa-lab-ui/theme';

import { FrontComponentCard } from '@/__stories__/shared/front-components/front-component-card';

type KovaaLabCRMUiGalleryCardProps = ComponentProps<typeof FrontComponentCard>;

export const KovaaLabCRMUiGalleryCard = ({
  title,
  children,
}: KovaaLabCRMUiGalleryCardProps) => (
  <ThemeProvider colorScheme="light">
    <FrontComponentCard title={title}>{children}</FrontComponentCard>
  </ThemeProvider>
);
