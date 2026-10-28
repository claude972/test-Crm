import { type StepIfElseBranch } from 'kovaa-lab-shared/workflow';
import { isDefined } from 'kovaa-lab-shared/utils';

export const getBranchesToDelete = (
  branches: StepIfElseBranch[],
  remainingFilterGroupIds: Set<string>,
): StepIfElseBranch[] => {
  const existingBranchFilterGroupIds = new Set(
    branches.map((b) => b.filterGroupId).filter(isDefined),
  );

  return branches.filter((branch, branchIndex) => {
    const isIfBranch = branchIndex === 0;
    const isElseBranch =
      branchIndex === branches.length - 1 && !isDefined(branch.filterGroupId);

    if (isIfBranch || isElseBranch) {
      return false;
    }

    return (
      isDefined(branch.filterGroupId) &&
      existingBranchFilterGroupIds.has(branch.filterGroupId) &&
      !remainingFilterGroupIds.has(branch.filterGroupId)
    );
  });
};
