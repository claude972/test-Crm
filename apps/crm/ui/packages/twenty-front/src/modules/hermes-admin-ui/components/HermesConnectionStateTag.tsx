import { useLingui } from '@lingui/react/macro';
import {
  IconAlertTriangle,
  IconCheck,
  IconCircleOff,
  IconClock,
  IconHelpCircle,
} from 'kovaa-lab-ui/icon';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';

import {
  formatHermesConnectionStateLabel,
  type HermesConnectionStateDescriptor,
} from '@/hermes-admin-ui/utils/hermesConnectionState';

type HermesConnectionStateTagProps = {
  descriptor: HermesConnectionStateDescriptor;
};

// One connection's state, in the contract's own five labels. Every tag carries
// an icon and words, so the state is never carried by colour alone. The
// wording is fixed and not softened: « Configuré, à vérifier » is not
// « connecté », and « Connexion désactivée » is a decision, not a failure.
export const HermesConnectionStateTag = ({
  descriptor,
}: HermesConnectionStateTagProps) => {
  const { t, i18n } = useLingui();

  const label = formatHermesConnectionStateLabel(
    descriptor,
    {
      notConfigured: t`Non configuré`,
      configuredUnverified: t`Configuré, à vérifier`,
      verifiedAt: (formattedDate) => t`Connecté, vérifié le ${formattedDate}`,
      error: t`Connexion en erreur`,
      disabled: t`Connexion désactivée`,
      unknown: t`État de connexion inconnu`,
    },
    (date) => i18n.date(date, { dateStyle: 'medium', timeStyle: 'short' }),
  );

  if (descriptor.kind === 'VERIFIED') {
    return (
      <Tag color="green" variant="soft" truncate={false} startIcon={<IconCheck />}>
        {label}
      </Tag>
    );
  }

  if (descriptor.kind === 'CONFIGURED_UNVERIFIED') {
    return (
      <Tag color="orange" variant="soft" truncate={false} startIcon={<IconClock />}>
        {label}
      </Tag>
    );
  }

  if (descriptor.kind === 'ERROR') {
    return (
      <Tag
        color="red"
        variant="soft"
        truncate={false}
        startIcon={<IconAlertTriangle />}
      >
        {label}
      </Tag>
    );
  }

  if (descriptor.kind === 'UNKNOWN') {
    return (
      <Tag
        color="gray"
        variant="outline"
        borderStyle="dashed"
        truncate={false}
        startIcon={<IconHelpCircle />}
      >
        {label}
      </Tag>
    );
  }

  // NOT_CONFIGURED and DISABLED. Both are settled facts rather than problems,
  // and both read as inactive rather than as errors.
  return (
    <Tag color="gray" variant="soft" truncate={false} startIcon={<IconCircleOff />}>
      {label}
    </Tag>
  );
};
