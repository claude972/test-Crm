import { v4 } from 'uuid';

import { type FlatSkill } from 'src/engine/metadata-modules/flat-skill/types/flat-skill.type';
import { KOVAALAB_STANDARD_APPLICATION } from 'src/engine/workspace-manager/kovaa-lab-standard-application/constants/kovaa-lab-standard-applications';
import { STANDARD_SKILL } from 'src/engine/workspace-manager/kovaa-lab-standard-application/constants/standard-skill.constant';
import { type AllStandardSkillName } from 'src/engine/workspace-manager/kovaa-lab-standard-application/types/all-standard-skill-name.type';
import { type StandardBuilderArgs } from 'src/engine/workspace-manager/kovaa-lab-standard-application/types/metadata-standard-buillder-args.type';

export type CreateStandardSkillContext = {
  skillName: AllStandardSkillName;
  name: string;
  label: string;
  icon: string | null;
  description: string | null;
  content: string;
  isCustom: boolean;
  isSystem: boolean;
  isActive?: boolean;
};

export type CreateStandardSkillArgs = StandardBuilderArgs<'skill'> & {
  context: CreateStandardSkillContext;
};

export const createStandardSkillFlatMetadata = ({
  context: {
    skillName,
    name,
    label,
    icon,
    description,
    content,
    isCustom,
    isSystem,
    isActive = true,
  },
  workspaceId,
  kovaa-labStandardApplicationId,
  now,
}: CreateStandardSkillArgs): FlatSkill => {
  const universalIdentifier = STANDARD_SKILL[skillName].universalIdentifier;

  return {
    id: v4(),
    universalIdentifier,
    name,
    label,
    icon,
    description,
    content,
    isCustom,
    isSystem,
    isActive,
    workspaceId,
    applicationId: kovaa-labStandardApplicationId,
    applicationUniversalIdentifier:
      KOVAALAB_STANDARD_APPLICATION.universalIdentifier,
    createdAt: now,
    updatedAt: now,
  };
};
