import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { Section } from 'kovaa-lab-ui/components/layout';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import {
  HermesAdminNote,
  HermesAdminRuleNote,
} from '@/hermes-admin-ui/components/HermesAdminNote';
import { HermesConnectionCard } from '@/hermes-admin-ui/components/HermesConnectionCard';
import {
  type HermesConnectionKind,
  type HermesConnectionsRead,
} from '@/hermes-admin-ui/types/HermesConnection';
import {
  type HermesConnectionCheckOutcome,
  type HermesConnectionProbe,
} from '@/hermes-admin-ui/types/HermesConnectionCheck';
import { filterHermesConnectionsByCompany } from '@/hermes-admin-ui/utils/hermesConnectionCapability';
import {
  buildHermesConnectionSlots,
  readHermesConnectionSlotKey,
} from '@/hermes-admin-ui/utils/hermesConnectionSlots';

const StyledCards = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));

  /* At 390px one column, so nothing is squeezed and the page never scrolls
     sideways. */
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

type HermesConnectionCenterProps = {
  read: HermesConnectionsRead;
  // The company whose connections are shown. A null id shows nothing rather
  // than everything: a connection centre that did not know which company it
  // was editing would be the worst possible screen in this product.
  activeCompanyId: string | null;
  activeCompanyName: string | null;
  // The last outcome of each read-only probe. Keyed by probe, not by
  // connection: a probe is the channel's own operation, and mail has two.
  checkByProbe: Readonly<
    Partial<Record<HermesConnectionProbe, HermesConnectionCheckOutcome>>
  >;
  checkedConnectionId: string | null;
  isChecking: boolean;
  onRequestTest: (connectionId: string) => void;
  onRequestEdit: (connectionId: string) => void;
  onRequestCreate: (connectionKind: HermesConnectionKind) => void;
};

// The one place connections are set up. Every channel appears whether or not
// anything is registered for it, so a channel with nothing set up reads
// « Non configuré » instead of being absent. No secret form exists anywhere
// else in the product, and no identifier is displayed outside this centre.
export const HermesConnectionCenter = ({
  read,
  activeCompanyId,
  activeCompanyName,
  checkByProbe,
  checkedConnectionId,
  isChecking,
  onRequestTest,
  onRequestEdit,
  onRequestCreate,
}: HermesConnectionCenterProps) => {
  const { t } = useLingui();

  const slots =
    read.kind === 'reported'
      ? buildHermesConnectionSlots(read.connections, activeCompanyId)
      : [];

  // Connections the parent handed over that belong to another company. They
  // are counted and announced rather than silently dropped, so a mixed list is
  // visible instead of looking like a short one.
  const otherCompanyCount =
    read.kind === 'reported'
      ? read.connections.length -
        filterHermesConnectionsByCompany(read.connections, activeCompanyId)
          .length
      : 0;

  return (
    <Section.Root>
      <Section.Header
        title={t`Connexions`}
        description={t`Tout se règle ici : aucun formulaire de secret ailleurs dans le produit.`}
      />

      <HermesAdminRuleNote>
        {isNonEmptyString(activeCompanyName)
          ? t`Ces connexions appartiennent à ${activeCompanyName} et à elle seule. Aucun réglage pris ici n’atteint une autre société exploitante.`
          : t`Aucune société exploitante active n’a été indiquée, donc aucune connexion n’est affichée : cet écran ne devine pas quelle société il réglerait.`}
      </HermesAdminRuleNote>

      {read.kind === 'loading' && (
        <HermesAdminNote role="status">
          {t`Lecture des connexions…`}
        </HermesAdminNote>
      )}

      {/* A failed read is unknown, not « nothing configured ». No channel is
          shown as « Non configuré » on this basis, because that would be a
          claim about a configuration nobody managed to read. */}
      {read.kind === 'unknown' && (
        <HermesAdminNote role="alert">
          {isNonEmptyString(read.message)
            ? t`Les connexions n’ont pas pu être lues, leur état est donc inconnu : ${read.message}`
            : t`Les connexions n’ont pas pu être lues, leur état est donc inconnu. Rechargez pour réessayer.`}
        </HermesAdminNote>
      )}

      {slots.length > 0 && (
        <StyledCards>
          {slots.map((slot) => (
            <HermesConnectionCard
              key={readHermesConnectionSlotKey(slot)}
              slot={slot}
              companyName={activeCompanyName}
              checkByProbe={checkByProbe}
              checkedConnectionId={checkedConnectionId}
              isChecking={isChecking}
              onRequestTest={onRequestTest}
              onRequestEdit={onRequestEdit}
              onRequestCreate={onRequestCreate}
            />
          ))}
        </StyledCards>
      )}

      {read.kind === 'reported' && activeCompanyId === null && (
        <HermesAdminNote role="status">
          {t`Aucun canal n’est présenté tant qu’une société exploitante active n’est pas connue.`}
        </HermesAdminNote>
      )}

      {read.kind === 'reported' && otherCompanyCount > 0 && (
        <HermesAdminNote role="status">
          {t`Connexions écartées parce qu’elles appartiennent à une autre société exploitante : ${otherCompanyCount}`}
        </HermesAdminNote>
      )}

      {read.kind === 'reported' && read.unreadableEntryCount > 0 && (
        <HermesAdminNote role="status">
          {t`Entrées écartées parce qu’elles n’ont pas pu être lues : ${read.unreadableEntryCount}`}
        </HermesAdminNote>
      )}

      <HermesAdminNote>
        {t`Aucun identifiant n’est saisi ni affiché ici. Une capacité que le serveur n’a pas confirmée est annoncée comme non confirmée, donc indisponible.`}
      </HermesAdminNote>
    </Section.Root>
  );
};
