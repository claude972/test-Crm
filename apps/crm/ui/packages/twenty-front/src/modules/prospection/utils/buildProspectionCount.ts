import { isDefined } from 'kovaa-lab-shared/utils';

import { type ProspectionCount } from '@/prospection/types/ProspectionCount';

export const unavailableProspectionCount = (): ProspectionCount => ({
  status: 'unavailable',
  value: null,
});

// Carries no value: a figure still being read is not a zero either.
export const loadingProspectionCount = (): ProspectionCount => ({
  status: 'loading',
  value: null,
});

export const exactProspectionCount = (value: number): ProspectionCount => ({
  status: 'exact',
  value,
});

type BuildCoveredProspectionCountArgs = {
  // Matching rows among those actually read.
  value: number;
  // Rows read.
  covered: number;
  // Rows the figure should have covered. Undefined when the total itself is
  // unknown, which makes the figure partial rather than exact.
  total: number | undefined;
};

// A figure computed over the rows on screen. It is exact only when those rows
// are all the rows there are; otherwise it carries its denominator.
export const buildCoveredProspectionCount = ({
  value,
  covered,
  total,
}: BuildCoveredProspectionCountArgs): ProspectionCount => {
  // No denominator is better than a denominator equal to what was read,
  // which would read as complete.
  if (!isDefined(total)) {
    return { status: 'partial', value, covered };
  }

  if (covered >= total) {
    return { status: 'exact', value };
  }

  return { status: 'partial', value, covered, total };
};
