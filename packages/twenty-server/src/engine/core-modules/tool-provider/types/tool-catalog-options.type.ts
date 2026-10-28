import { type ToolCategory } from 'kovaa-lab-shared/ai';

export type ToolCatalogOptions = {
  categories?: ToolCategory[];
  excludeTools?: Set<string>;
};
