import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import {
  IconPencil,
  IconPlayerPause,
  IconQuestionMark,
  IconRobot,
  IconUser,
} from 'kovaa-lab-ui/icon';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';

import { type HermesBotPolicy } from '@/hermes-bot-settings/types/HermesBotPolicy';

type HermesBotPolicyModeTagProps = {
  policy: HermesBotPolicy;
};

// What the server reported for this scope, said in words rather than in the
// protocol's token.
//
// A mode outside the published set is shown as the server's own string, marked
// as not recognised. It is never mapped onto a mode this client does know:
// showing AUTO for a value nobody understands would claim a delegation that
// was never granted.
export const HermesBotPolicyModeTag = ({
  policy,
}: HermesBotPolicyModeTagProps) => {
  const { t } = useLingui();

  if (policy.mode === 'AUTO') {
    return (
      <Tag
        color="amber"
        variant="outline"
        borderStyle="dashed"
        weight="medium"
        truncate={false}
        startIcon={<IconRobot />}
      >
        {t`The bot may reply on its own`}
      </Tag>
    );
  }

  if (policy.mode === 'ASSISTED') {
    return (
      <Tag
        color="blue"
        variant="soft"
        weight="medium"
        truncate={false}
        startIcon={<IconPencil />}
      >
        {t`The bot drafts, a human sends`}
      </Tag>
    );
  }

  if (policy.mode === 'OFF') {
    return (
      <Tag
        color="gray"
        variant="soft"
        weight="medium"
        truncate={false}
        startIcon={<IconPlayerPause />}
      >
        {t`No draft and no bot call`}
      </Tag>
    );
  }

  // A channel with no policy of its own. The company-wide setting applies, and
  // it is deliberately not resolved here: naming a mode the server did not
  // send for this scope would be a second policy.
  if (policy.mode === 'INHERIT') {
    return (
      <Tag
        color="gray"
        variant="outline"
        weight="medium"
        truncate={false}
        startIcon={<IconUser />}
      >
        {t`Follows the company setting`}
      </Tag>
    );
  }

  return (
    <Tag
      color="gray"
      variant="outline"
      borderStyle="dashed"
      weight="medium"
      truncate={false}
      startIcon={<IconQuestionMark />}
    >
      {isNonEmptyString(policy.unknownMode)
        ? t`Mode not recognised: ${policy.unknownMode}`
        : t`Mode unknown`}
    </Tag>
  );
};
