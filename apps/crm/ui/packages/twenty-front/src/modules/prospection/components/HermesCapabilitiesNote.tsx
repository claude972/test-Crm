import { useLingui } from '@lingui/react/macro';

import { ProspectionNote } from '@/prospection/components/ProspectionNote';
import { type HermesCapabilities } from '@/prospection/types/HermesImportState';

type HermesCapabilitiesNoteProps = {
  capabilities: HermesCapabilities;
};

// The capabilities as published, never rounded up. A false flag and an
// unreadable flag both stay short of "available", and neither this note nor
// anything else on these screens offers a send.
export const HermesCapabilitiesNote = ({
  capabilities,
}: HermesCapabilitiesNoteProps) => {
  const { t } = useLingui();

  const facts = [
    capabilities.smtpCampaignSending === true
      ? t`Sending stays outside this screen.`
      : capabilities.smtpCampaignSending === false
        ? t`Campaign sending unavailable.`
        : t`Sending capability unknown.`,
    capabilities.trackingDefault === false
      ? t`Tracking off by default.`
      : capabilities.trackingDefault === true
        ? t`Tracking on by default.`
        : t`Tracking default unknown.`,
  ];

  return (
    <>
      <ProspectionNote>{t`Nothing is sent from here: staging, qualification and drafts only.`}</ProspectionNote>
      <ProspectionNote>{facts.join(' · ')}</ProspectionNote>
    </>
  );
};
