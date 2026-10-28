import { getChipLabel } from '@/ui/field/display/utils/getChipLabel';
import { LinkChip } from '@/ui/navigation/link/components/LinkChip/LinkChip';
import { SettingsPath } from 'kovaa-lab-shared/types';
import { getSettingsPath } from 'kovaa-lab-shared/utils';
import { useIcons } from 'kovaa-lab-ui/icon';
import { useTheme } from 'kovaa-lab-ui/theme';

import { DEFAULT_SKILL_ICON } from '@/skill-suggestion/constants/DefaultSkillIcon';

type SkillReferenceChipProps = {
  skillId: string;
  label: string;
  icon: string | null;
};

export const SkillReferenceChip = ({
  skillId,
  label,
  icon,
}: SkillReferenceChipProps) => {
  const theme = useTheme();
  const { getIcon } = useIcons();
  const Icon = getIcon(icon ?? DEFAULT_SKILL_ICON);

  return (
    <LinkChip
      to={getSettingsPath(SettingsPath.AiSkillDetail, { skillId })}
      variant="soft"
      startElement={
        <Icon size={theme.icon.size.sm} stroke={theme.icon.stroke.sm} />
      }
    >
      {getChipLabel(label).content}
    </LinkChip>
  );
};
