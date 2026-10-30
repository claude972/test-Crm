import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useId, useState, type FormEvent } from 'react';
import { Button, Input } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesAdminRuleNote } from '@/hermes-admin-ui/components/HermesAdminNote';
import { HermesCompanyActionNote } from '@/hermes-admin-ui/components/HermesCompanyActionNote';
import { type HermesAdminContextValidity } from '@/hermes-admin-ui/types/HermesAdminContext';
import {
  type HermesCompanyActionCapability,
  type HermesCompanyActionState,
} from '@/hermes-admin-ui/types/HermesCompany';
import { canWriteInHermesAdminContext } from '@/hermes-admin-ui/utils/hermesAdminWrite';

const StyledBlock = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledForm = styled.form`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledFieldset = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledLabel = styled.label`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledError = styled.p`
  color: ${themeCssVariables.font.color.danger};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

export type HermesCompanyDraft = {
  name: string;
  trade: string;
};

type HermesCompanyAddFormProps = {
  capability: HermesCompanyActionCapability;
  state: HermesCompanyActionState;
  contextValidity: HermesAdminContextValidity;
  onSubmit: (draft: HermesCompanyDraft) => void;
  onRequestReload: () => void;
};

// Adding an operating company, which needs the multi-company capability active
// and the creation right. Without both, there is no form and no button here at
// all — only the explanation, because a disabled button would suggest a right
// is the single thing missing.
export const HermesCompanyAddForm = ({
  capability,
  state,
  contextValidity,
  onSubmit,
  onRequestReload,
}: HermesCompanyAddFormProps) => {
  const { t } = useLingui();

  const fieldIdPrefix = useId();

  const [draft, setDraft] = useState<HermesCompanyDraft>({
    name: '',
    trade: '',
  });

  const [nameError, setNameError] = useState<string | null>(null);

  const canAdd =
    capability.kind === 'available' &&
    canWriteInHermesAdminContext(contextValidity);

  const isRequesting = state.kind === 'requesting';

  const nameId = `${fieldIdPrefix}-name`;
  const tradeId = `${fieldIdPrefix}-trade`;
  const nameErrorId = `${fieldIdPrefix}-name-error`;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (draft.name.trim() === '') {
      setNameError(t`Donnez un nom à cette société exploitante.`);

      return;
    }

    setNameError(null);
    onSubmit(draft);
  };

  const distinction = (
    <HermesAdminRuleNote>
      {t`Une société exploitante est un espace de travail : elle possède ses connexions, ses politiques et ses membres. Ce n’est pas une fiche client — une société cliente se crée dans le CRM, pas ici.`}
    </HermesAdminRuleNote>
  );

  if (!canAdd) {
    return (
      <StyledBlock>
        {distinction}

        <HermesCompanyActionNote
          capability={capability}
          state={state}
          actionLabel={t`Ajout d’une société`}
          onRequestReload={onRequestReload}
        />
      </StyledBlock>
    );
  }

  return (
    <StyledForm
      onSubmit={handleSubmit}
      aria-label={t`Ajouter une société exploitante`}
    >
      {distinction}

      <StyledFieldset>
        <StyledLabel htmlFor={nameId}>{t`Nom de la société`}</StyledLabel>
        <Input
          id={nameId}
          value={draft.name}
          onValueChange={(next) =>
            setDraft((current) => ({ ...current, name: next }))
          }
          disabled={isRequesting}
          required
          aria-invalid={isNonEmptyString(nameError) ? true : undefined}
          aria-describedby={
            isNonEmptyString(nameError) ? nameErrorId : undefined
          }
        />
        {isNonEmptyString(nameError) && (
          <StyledError id={nameErrorId} role="alert">
            {nameError}
          </StyledError>
        )}
      </StyledFieldset>

      <StyledFieldset>
        <StyledLabel htmlFor={tradeId}>{t`Activité`}</StyledLabel>
        <Input
          id={tradeId}
          value={draft.trade}
          onValueChange={(next) =>
            setDraft((current) => ({ ...current, trade: next }))
          }
          disabled={isRequesting}
        />
      </StyledFieldset>

      <StyledActions>
        <Button type="submit" variant="solid" size="sm" loading={isRequesting}>
          {t`Ajouter la société`}
        </Button>
      </StyledActions>

      <HermesCompanyActionNote
        capability={capability}
        state={state}
        actionLabel={t`Ajout d’une société`}
        onRequestReload={onRequestReload}
      />
    </StyledForm>
  );
};
