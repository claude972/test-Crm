import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { IconAlertTriangle } from 'kovaa-lab-ui/icon';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesAdminNote } from '@/hermes-admin-ui/components/HermesAdminNote';

const StyledBanner = styled.div`
  border: 1px solid ${themeCssVariables.border.color.strong};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

type HermesReloadRequestProps = {
  // Said in the words of the situation, not in a generic « something went
  // wrong »: the operator has to know what changed under them.
  headline: string;
  // The server's own message, when it gave one. It is shown verbatim rather
  // than rewritten.
  message: string | null;
  onRequestReload: () => void;
};

// A refusal the operator answers by reloading, never a retry started here.
// « Session remplacée » is a settled answer: the session and the native cookie
// no longer agree, usually after a switch in another tab. A retry would repeat
// the refusal or, worse, succeed against a company nobody is looking at. So
// the only control is a reload, and the reason is written out.
export const HermesReloadRequest = ({
  headline,
  message,
  onRequestReload,
}: HermesReloadRequestProps) => {
  const { t } = useLingui();

  return (
    <StyledBanner role="alert">
      <StyledRow>
        <Tag
          color="orange"
          variant="soft"
          truncate={false}
          startIcon={<IconAlertTriangle />}
        >
          {t`Rechargement nécessaire`}
        </Tag>
      </StyledRow>

      <HermesAdminNote>{headline}</HermesAdminNote>

      {isNonEmptyString(message) && (
        <HermesAdminNote>
          {t`Motif renvoyé par le serveur : ${message}`}
        </HermesAdminNote>
      )}

      <HermesAdminNote>
        {t`Rien n’est réessayé automatiquement : une nouvelle tentative porterait sur une session ou une société qui n’est plus celle affichée.`}
      </HermesAdminNote>

      {/* No promise of cancellation: a write authorised under the previous
          company can finish after the switch, and nothing here undoes it. */}
      <HermesAdminNote>
        {t`Une opération autorisée sous la société précédente peut s’être terminée malgré tout. Elle n’est pas annulable, et cet écran ne prétend pas l’annuler : rechargez pour voir l’état réellement enregistré.`}
      </HermesAdminNote>

      <StyledRow>
        <Button variant="outline" size="sm" onClick={onRequestReload}>
          {t`Recharger les réglages`}
        </Button>
      </StyledRow>
    </StyledBanner>
  );
};
