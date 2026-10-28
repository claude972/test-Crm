import { type BreadcrumbItem } from 'kovaa-lab-ui/primitives/navigation';

export type BreadcrumbProps = {
  links: Pick<BreadcrumbItem, 'children' | 'href'>[];
};
