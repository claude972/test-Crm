import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { IconLock } from 'kovaa-lab-ui/icon';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { Button, Input } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import {
  HermesAdminNote,
  HermesAdminRuleNote,
} from '@/hermes-admin-ui/components/HermesAdminNote';
import { HermesConnectionCheckNote } from '@/hermes-admin-ui/components/HermesConnectionCheckNote';
import { HermesReloadRequest } from '@/hermes-admin-ui/components/HermesReloadRequest';
import { type HermesAdminContextValidity } from '@/hermes-admin-ui/types/HermesAdminContext';
import { type HermesConnectionKind } from '@/hermes-admin-ui/types/HermesConnection';
import {
  isHermesKindProbable,
  readHermesProbesForUiKind,
  type HermesConnectionCheckOutcome,
  type HermesConnectionProbe,
} from '@/hermes-admin-ui/types/HermesConnectionCheck';
import {
  HERMES_CONNECTION_FORM_EMPTY_VALUES,
  HERMES_INTAKE_SOURCES,
  type HermesConnectionFormSubject,
  type HermesConnectionFormSubmission,
  type HermesConnectionFormValues,
  type HermesConnectionSaveState,
  type HermesIntakeSource,
  type HermesNativeConnectedAccount,
  type HermesSecretField,
} from '@/hermes-admin-ui/types/HermesConnectionForm';
import {
  checkHermesSecretEntry,
  hasHermesOwnSecretField,
  readHermesConnectionSecretPolicy,
  readHermesConnectionWriteGate,
  readHermesNativeAccountAddress,
  readHermesSecretFields,
  validateHermesConnectionForm,
  type HermesConnectionFormIssues,
} from '@/hermes-admin-ui/utils/hermesAdminWrite';
import {
  hermesSecretPlaceholder,
  readHermesSecretField,
} from '@/hermes-admin-ui/utils/hermesSecret';

const StyledForm = styled.form`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  min-width: 0;
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

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledFieldName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledSelect = styled.select`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  max-width: 100%;
  padding: ${themeCssVariables.spacing[2]};

  &:focus-visible {
    outline: 1px solid ${themeCssVariables.border.color.strong};
    outline-offset: 1px;
  }
`;

const StyledCheckboxRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[1]} 0;
`;

const StyledCheckboxLabel = styled.label`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledError = styled.p`
  color: ${themeCssVariables.font.color.danger};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

const StyledConfirmation = styled.div`
  border: 1px solid ${themeCssVariables.border.color.strong};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

type HermesConnectionFormProps = {
  subject: HermesConnectionFormSubject;
  companyName: string | null;
  // Non-secret values the parent read back. The secret is deliberately not
  // among them: no prop on this component could carry one in.
  initialValues?: HermesConnectionFormValues;
  // The existing native connected IMAP and SMTP accounts, already encrypted
  // server side. An e-mail link picks one of these; it never types credentials.
  nativeAccounts?: readonly HermesNativeConnectedAccount[];
  // Where the native mailbox creation panel is rendered. This form owns the
  // hole, not its contents: the panel and its hook belong to the lot that
  // extracted them from the native account path, and the credentials stay in
  // the native encrypted store. No second password store is introduced here.
  mailboxSetupSlot?: ReactNode;
  saveState: HermesConnectionSaveState;
  // The last outcome of each read-only probe published for this kind. Mail has
  // two — reception and sending — and they are shown as two answers, because a
  // mailbox that receives is not a mailbox that sends.
  checkByProbe: Readonly<
    Partial<Record<HermesConnectionProbe, HermesConnectionCheckOutcome>>
  >;
  isChecking: boolean;
  contextValidity: HermesAdminContextValidity;
  onSubmit: (submission: HermesConnectionFormSubmission) => void;
  onRequestDelete: (expectedRevision: string) => void;
  onRequestTest: () => void;
  onCancel: () => void;
  onRequestReload: () => void;
};

// Adding or changing one connection. An existing secret is never displayed and
// never sent back to the browser: the field starts empty, shows a fixed mask as
// its placeholder when something is stored, and submitting it untouched sends
// nothing about the secret, so the server keeps what it holds.
export const HermesConnectionForm = ({
  subject,
  companyName,
  initialValues,
  nativeAccounts,
  mailboxSetupSlot,
  saveState,
  checkByProbe,
  isChecking,
  contextValidity,
  onSubmit,
  onRequestDelete,
  onRequestTest,
  onCancel,
  onRequestReload,
}: HermesConnectionFormProps) => {
  const { t } = useLingui();

  const fieldIdPrefix = useId();

  const [values, setValues] = useState<HermesConnectionFormValues>(
    initialValues ?? HERMES_CONNECTION_FORM_EMPTY_VALUES,
  );

  // The only place a typed secret lives, and only while this form is open.
  // Keyed by the server's own field names; never read back from the server and
  // never put in browser storage.
  const [typedSecrets, setTypedSecrets] = useState<
    Partial<Record<HermesSecretField, string>>
  >({});

  const [issues, setIssues] = useState<HermesConnectionFormIssues>({});

  const hasSelectableAccounts = (nativeAccounts ?? []).length > 0;

  // Nothing is written before the operator has read what the write will stop.
  const [pending, setPending] = useState<'none' | 'save' | 'delete'>('none');

  const kindLabels: Record<HermesConnectionKind, string> = {
    WHATSAPP_EVOLUTION: t`WhatsApp (Evolution)`,
    EMAIL_IMAP: t`E-mail entrant (IMAP)`,
    EMAIL_SMTP: t`E-mail sortant (SMTP)`,
    MCP: t`MCP`,
    SIGNED_INTAKE: t`Collectes signées`,
    FORMS: t`Formulaires`,
    APPOINTMENTS: t`Rendez-vous`,
  };

  // Named exactly as the server names each secret, so an operator pasting a
  // value knows which one they are replacing.
  const secretLabels: Record<HermesSecretField, string> = {
    apiKey: t`Clé d’API (apiKey)`,
    webhookSecret: t`Secret de webhook (webhookSecret)`,
    token: t`Jeton (token)`,
    secret: t`Secret de signature (secret)`,
  };

  const secretHints: Record<HermesSecretField, string> = {
    apiKey: t`La clé que le fournisseur Evolution attend sur ses appels.`,
    webhookSecret: t`Exactement soixante-quatre caractères hexadécimaux minuscules, et différent de la clé d’API. Il authentifie les réceptions.`,
    token: t`Au moins trente-deux caractères imprimables.`,
    secret: t`Exactement soixante-quatre caractères hexadécimaux minuscules. Il signe les collectes entrantes.`,
  };

  const sourceLabels: Record<HermesIntakeSource, string> = {
    SCRAPING: t`Collecte signée (scraping)`,
    FORMS: t`Formulaires`,
    CALENDAR: t`Rendez-vous`,
  };

  const kindLabel =
    subject.kind !== null
      ? kindLabels[subject.kind]
      : subject.mode === 'edit' && isNonEmptyString(subject.unknownKind)
        ? t`Type non reconnu : ${subject.unknownKind}`
        : t`Type non reconnu`;

  const secretPolicy = readHermesConnectionSecretPolicy(subject.kind);
  const showsSecretField = hasHermesOwnSecretField(secretPolicy);
  const secretFields = readHermesSecretFields(secretPolicy);
  const secretEntry = checkHermesSecretEntry(secretFields, typedSecrets);

  // A signed collection is an endpoint OTHERS call: it has no address to dial
  // and no name of its own, only an ingress policy.
  const isIntakeKind = subject.kind === 'SIGNED_INTAKE';

  const secretRead = readHermesSecretField(
    subject.mode === 'edit' ? subject.hasStoredSecret : false,
  );

  const writeGate = readHermesConnectionWriteGate(subject, contextValidity);

  const isSaving = saveState.kind === 'saving';

  // The probes published for this kind. An empty list means this build has no
  // read-only operation for the channel, which is said plainly rather than
  // left as a button that appears to work.
  const probes = readHermesProbesForUiKind(subject.kind);
  const isProbable = isHermesKindProbable(subject.kind);

  const labelId = `${fieldIdPrefix}-label`;
  const endpointId = `${fieldIdPrefix}-endpoint`;
  const accountId = `${fieldIdPrefix}-account`;
  const secretId = `${fieldIdPrefix}-secret`;
  const labelErrorId = `${fieldIdPrefix}-label-error`;
  const endpointErrorId = `${fieldIdPrefix}-endpoint-error`;
  const secretHelpId = `${fieldIdPrefix}-secret-help`;
  const nativeAccountId = `${fieldIdPrefix}-native-account`;
  const nativeAccountErrorId = `${fieldIdPrefix}-native-account-error`;
  const imapFolderId = `${fieldIdPrefix}-imap-folder`;
  const imapFolderHelpId = `${fieldIdPrefix}-imap-folder-help`;
  const allowedSourcesId = `${fieldIdPrefix}-allowed-sources`;
  const maxRateId = `${fieldIdPrefix}-max-rate`;
  const maxRateHelpId = `${fieldIdPrefix}-max-rate-help`;

  // What the two generic fields mean for this kind. « Adresse du service » is
  // true of an MCP endpoint and useless for an Evolution instance, so each
  // kind names its own.
  const kindFieldLabels =
    subject.kind === 'WHATSAPP_EVOLUTION'
      ? { name: t`Nom de l’instance`, endpoint: t`Adresse de base Evolution` }
      : { name: t`Nom de la connexion`, endpoint: t`Adresse du service` };

  // Read only, and a consequence of the chosen account rather than an input.
  const attachedAddress = readHermesNativeAccountAddress(
    nativeAccounts ?? [],
    values.nativeAccountId,
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const found = validateHermesConnectionForm(
      secretPolicy,
      values,
      subject.kind,
    );

    setIssues(found);

    if (Object.keys(found).length > 0) {
      return;
    }

    // One secret filled out of two would erase the other on the server, so
    // nothing is sent until the set is complete or untouched.
    if (secretEntry.kind === 'partial') {
      return;
    }

    setPending('save');
  };

  const confirmSave = () => {
    if (writeGate.kind !== 'sendable') {
      return;
    }

    setPending('none');
    onSubmit({
      values,
      secret:
        showsSecretField && secretEntry.kind === 'complete'
          ? { kind: 'replaced', values: typedSecrets }
          : { kind: 'unchanged' },
      expectedRevision: writeGate.expectedRevision,
    });
    // Nothing of the secrets is kept once they have left.
    setTypedSecrets({});
  };

  const confirmDelete = () => {
    if (writeGate.kind !== 'sendable' || writeGate.expectedRevision === null) {
      return;
    }

    setPending('none');
    onRequestDelete(writeGate.expectedRevision);
  };

  return (
    <StyledForm
      onSubmit={handleSubmit}
      aria-label={
        subject.mode === 'create'
          ? t`Ajouter une connexion ${kindLabel}`
          : t`Modifier la connexion ${kindLabel}`
      }
    >
      <HermesAdminRuleNote>
        {isNonEmptyString(companyName)
          ? t`Cette connexion appartient à ${companyName}. Elle n’a aucun effet sur une autre société exploitante.`
          : t`Aucune société exploitante active n’est indiquée : enregistrer sans savoir laquelle est réglée n’est pas proposé.`}
      </HermesAdminRuleNote>

      {/* An e-mail link is three things and nothing else: the native account
          chosen from the existing encrypted ones, the IMAP reception folder,
          and the address the server attaches to that account. No password. */}
      {secretPolicy.kind === 'native-account' ? (
        <>
          <HermesAdminRuleNote>
            {t`Cette liaison e-mail s’appuie sur un compte connecté natif, déjà chiffré : il n’existe pas de second magasin d’identifiants chez nous. Aucun mot de passe de boîte ne se saisit ici.`}
          </HermesAdminRuleNote>

          <StyledFieldset>
            <StyledLabel htmlFor={nativeAccountId}>
              {t`Compte connecté natif`}
            </StyledLabel>
            <StyledSelect
              id={nativeAccountId}
              value={values.nativeAccountId}
              // An empty list is not a choice: offering it as a live control
              // presents « choose an account » as though the choice were
              // merely empty.
              disabled={isSaving || !hasSelectableAccounts}
              aria-invalid={
                issues.nativeAccountId === 'required' ? true : undefined
              }
              aria-describedby={
                issues.nativeAccountId === 'required'
                  ? nativeAccountErrorId
                  : undefined
              }
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  nativeAccountId: event.target.value,
                }))
              }
            >
              <option value="">
                {hasSelectableAccounts
                  ? t`Choisir un compte connecté`
                  : t`Aucun compte à choisir`}
              </option>
              {(nativeAccounts ?? []).map((account) => (
                <option key={account.id} value={account.id}>
                  {/* The account's own name, then the address the server
                      attached to it. A raw identifier is never shown as a
                      name: a UUID read as a mailbox is how the wrong account
                      gets bound. An account the server named neither way is
                      said to be unnamed, and stays selectable. */}
                  {isNonEmptyString(account.label)
                    ? isNonEmptyString(account.address)
                      ? `${account.label} — ${account.address}`
                      : account.label
                    : isNonEmptyString(account.address)
                      ? account.address
                      : t`Compte sans nom ni adresse renvoyés par le serveur`}
                </option>
              ))}
            </StyledSelect>

            {/* This form never says the company HAS no native account: it did
                not read the list, it was handed one, and an empty hand-off is
                not a verdict. Whoever performed the read states what it
                established — in flight, unreadable, or reported empty — and
                those three never collapse into one sentence here. */}
            {!hasSelectableAccounts && mailboxSetupSlot === undefined && (
              <HermesAdminNote role="status">
                {t`Aucun compte connecté natif IMAP ou SMTP n’a été transmis à ce formulaire. Connectez-en un dans les comptes du produit : rien ne se saisit ici à sa place.`}
              </HermesAdminNote>
            )}

            {/* Rendered whatever the account list looks like: an operator may
                need a second mailbox even when one already works. */}
            {mailboxSetupSlot}

            {issues.nativeAccountId === 'required' && (
              <StyledError id={nativeAccountErrorId} role="alert">
                {t`Choisissez le compte connecté natif qui portera cette liaison.`}
              </StyledError>
            )}
          </StyledFieldset>

          <StyledFieldset>
            <StyledLabel htmlFor={imapFolderId}>
              {t`Dossier de réception IMAP`}
            </StyledLabel>
            <Input
              id={imapFolderId}
              value={values.imapFolder}
              onValueChange={(next) =>
                setValues((current) => ({ ...current, imapFolder: next }))
              }
              disabled={isSaving}
              required
              autoComplete="off"
              spellCheck={false}
              aria-invalid={issues.imapFolder === 'required' ? true : undefined}
              aria-describedby={imapFolderHelpId}
            />
            {/* Mis-labelling this as an address would make people type an
                e-mail that can never work. It is a folder the server locks
                while it collects. */}
            <HermesAdminNote id={imapFolderHelpId}>
              {t`Il s’agit d’un dossier IMAP, pas d’une adresse e-mail. Exemple : INBOX.`}
            </HermesAdminNote>
            {issues.imapFolder === 'required' && (
              <StyledError role="alert">
                {t`Indiquez le dossier IMAP à relever, par exemple INBOX.`}
              </StyledError>
            )}
          </StyledFieldset>

          <StyledFieldset>
            <StyledFieldName>
              {t`Adresse rattachée par le serveur`}
            </StyledFieldName>
            <HermesAdminNote>
              {isNonEmptyString(attachedAddress)
                ? attachedAddress
                : t`Le serveur n’a rattaché aucune adresse à ce compte, ou aucun compte n’est encore choisi. Cette valeur est une conséquence du compte, elle ne se saisit pas.`}
            </HermesAdminNote>
          </StyledFieldset>
        </>
      ) : isIntakeKind ? (
        <>
          {/* A signed collection is an endpoint OTHERS call. There is nothing
              to dial, so no address is asked for — only the ingress policy. */}
          <HermesAdminRuleNote>
            {t`Une collecte signée est un point d’entrée que l’on appelle, pas un service à joindre : il n’y a donc aucune adresse à saisir. Ce qui se règle ici, c’est ce qu’elle accepte.`}
          </HermesAdminRuleNote>

          <StyledFieldset>
            <StyledFieldName id={allowedSourcesId}>
              {t`Sources autorisées`}
            </StyledFieldName>

            <div role="group" aria-labelledby={allowedSourcesId}>
              {HERMES_INTAKE_SOURCES.map((source) => (
                <StyledCheckboxRow key={source}>
                  <input
                    type="checkbox"
                    id={`${allowedSourcesId}-${source}`}
                    checked={values.allowedSources.includes(source)}
                    disabled={isSaving}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        allowedSources: event.target.checked
                          ? [...current.allowedSources, source]
                          : current.allowedSources.filter(
                              (kept) => kept !== source,
                            ),
                      }))
                    }
                  />
                  <StyledCheckboxLabel
                    htmlFor={`${allowedSourcesId}-${source}`}
                  >
                    {sourceLabels[source]}
                  </StyledCheckboxLabel>
                </StyledCheckboxRow>
              ))}
            </div>

            {/* Nothing is pre-checked: an unchecked source is not an accepted
                one, and choosing for the operator would be this screen
                deciding their ingress policy. */}
            <HermesAdminNote>
              {t`Rien n’est coché par défaut. Une source non cochée n’est pas acceptée, et choisir à votre place reviendrait à décider de votre politique de collecte.`}
            </HermesAdminNote>

            {issues.allowedSources === 'required' && (
              <StyledError role="alert">
                {t`Choisissez au moins une source à accepter.`}
              </StyledError>
            )}
          </StyledFieldset>

          <StyledFieldset>
            <StyledLabel htmlFor={maxRateId}>
              {t`Requêtes acceptées par minute`}
            </StyledLabel>
            <Input
              id={maxRateId}
              value={values.maxRequestsPerMinute}
              onValueChange={(next) =>
                setValues((current) => ({
                  ...current,
                  maxRequestsPerMinute: next,
                }))
              }
              disabled={isSaving}
              required
              autoComplete="off"
              inputMode="numeric"
              aria-invalid={
                issues.maxRequestsPerMinute === 'required' ? true : undefined
              }
              aria-describedby={maxRateHelpId}
            />
            <HermesAdminNote id={maxRateHelpId}>
              {t`Un entier entre 1 et 60. Au-delà, les requêtes sont refusées plutôt que mises en attente.`}
            </HermesAdminNote>
            {issues.maxRequestsPerMinute === 'required' && (
              <StyledError role="alert">
                {t`Indiquez un entier entre 1 et 60.`}
              </StyledError>
            )}
          </StyledFieldset>
        </>
      ) : (
        <>
          <StyledFieldset>
            <StyledLabel htmlFor={labelId}>{kindFieldLabels.name}</StyledLabel>
            <Input
              id={labelId}
              value={values.label}
              onValueChange={(next) =>
                setValues((current) => ({ ...current, label: next }))
              }
              disabled={isSaving}
              required
              aria-invalid={issues.label === 'required' ? true : undefined}
              aria-describedby={
                issues.label === 'required' ? labelErrorId : undefined
              }
            />
            {issues.label === 'required' && (
              <StyledError id={labelErrorId} role="alert">
                {t`Donnez un nom à cette connexion pour la reconnaître dans la liste.`}
              </StyledError>
            )}
          </StyledFieldset>

          <StyledFieldset>
            <StyledLabel htmlFor={endpointId}>
              {kindFieldLabels.endpoint}
            </StyledLabel>
            <Input
              id={endpointId}
              value={values.endpoint}
              onValueChange={(next) =>
                setValues((current) => ({ ...current, endpoint: next }))
              }
              disabled={isSaving}
              required
              autoComplete="off"
              aria-invalid={issues.endpoint === 'required' ? true : undefined}
              aria-describedby={
                issues.endpoint === 'required' ? endpointErrorId : undefined
              }
            />
            {issues.endpoint === 'required' && (
              <StyledError id={endpointErrorId} role="alert">
                {t`Indiquez l’adresse du service à joindre.`}
              </StyledError>
            )}
          </StyledFieldset>

          <StyledFieldset>
            <StyledLabel htmlFor={accountId}>
              {t`Compte ou identifiant public`}
            </StyledLabel>
            <Input
              id={accountId}
              value={values.account}
              onValueChange={(next) =>
                setValues((current) => ({ ...current, account: next }))
              }
              disabled={isSaving}
              autoComplete="off"
            />
            <HermesAdminNote>
              {t`Ce champ est pour une valeur publique, comme une boîte ou un numéro d’instance. N’y mettez aucun secret.`}
            </HermesAdminNote>
          </StyledFieldset>
        </>
      )}

      {secretPolicy.kind === 'unknown' && (
        <HermesAdminRuleNote>
          {t`Le type de cette connexion n’est pas reconnu, donc aucun champ de secret n’est proposé : cet écran ne sait pas où une valeur partirait.`}
        </HermesAdminRuleNote>
      )}

      {showsSecretField && (
        <>
          {secretFields.map((field) => (
            <StyledFieldset key={field}>
              <StyledLabel htmlFor={`${secretId}-${field}`}>
                {secretLabels[field]}
              </StyledLabel>
              <Input
                id={`${secretId}-${field}`}
                type="password"
                value={typedSecrets[field] ?? ''}
                onValueChange={(next) =>
                  setTypedSecrets((current) => ({ ...current, [field]: next }))
                }
                disabled={isSaving}
                // No browser filling, storing or completing this field.
                autoComplete="new-password"
                spellCheck={false}
                placeholder={hermesSecretPlaceholder(secretRead)}
                aria-describedby={secretHelpId}
              />
              <HermesAdminNote>{secretHints[field]}</HermesAdminNote>
            </StyledFieldset>
          ))}

          <StyledActions>
            <Tag
              color="gray"
              variant="outline"
              truncate={false}
              startIcon={<IconLock />}
            >
              {secretRead.kind === 'stored'
                ? t`Un secret est enregistré côté serveur`
                : secretRead.kind === 'absent'
                  ? t`Aucun secret enregistré`
                  : t`Présence d’un secret inconnue`}
            </Tag>
          </StyledActions>

          {/* The contract of these fields, said out loud: a stored value never
              comes back, so it cannot be shown or checked — only replaced. */}
          <HermesAdminRuleNote id={secretHelpId}>
            {secretRead.kind === 'stored'
              ? t`La valeur enregistrée reste côté serveur : elle n’est jamais renvoyée au navigateur, donc ni affichée ni relue ici. Laissez ces champs vides pour la conserver telle quelle, ou saisissez une nouvelle valeur pour la remplacer.`
              : t`La valeur saisie partira vers le serveur, y restera, et ne sera jamais renvoyée au navigateur : elle ne pourra plus être relue depuis cet écran, seulement remplacée.`}
          </HermesAdminRuleNote>

          {/* Supplying the secret object replaces the COMPLETE set, so one
              field filled out of two would erase the other. Nothing is sent. */}
          {secretFields.length > 1 && (
            <HermesAdminRuleNote>
              {t`Ces secrets se remplacent ensemble : enregistrer n’en envoie pas un seul, car le serveur remplace alors l’ensemble et l’autre serait effacé. Laissez les deux vides pour les conserver, ou renseignez les deux pour les remplacer.`}
            </HermesAdminRuleNote>
          )}

          {secretEntry.kind === 'partial' && (
            <HermesAdminNote role="alert">
              {t`Rien ne sera envoyé : un seul des deux secrets est renseigné, et l’envoyer seul effacerait l’autre. Renseignez les deux, ou videz celui que vous avez saisi pour les conserver tels quels.`}
            </HermesAdminNote>
          )}
        </>
      )}

      <StyledActions>
        <Button
          type="submit"
          variant="solid"
          size="sm"
          loading={isSaving}
          disabled={writeGate.kind !== 'sendable' || pending !== 'none'}
        >
          {subject.mode === 'create'
            ? t`Enregistrer la connexion`
            : t`Enregistrer les modifications`}
        </Button>

        {/* The test asks the parent, which asks the server. This button never
            interprets anything: it shows the result it is given.

            Disabled on a create — there is nothing saved to reach — and
            disabled when no probe exists for the kind, rather than offered and
            silently doing nothing. */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={isChecking}
          disabled={subject.mode === 'create' || !isProbable}
          onClick={onRequestTest}
        >
          {t`Tester la connexion`}
        </Button>

        {subject.mode === 'edit' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={writeGate.kind !== 'sendable' || pending !== 'none'}
            onClick={() => setPending('delete')}
          >
            {t`Supprimer la connexion`}
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isSaving}
          onClick={onCancel}
        >
          {t`Annuler`}
        </Button>
      </StyledActions>

      {/* Nothing left the browser. A missing revision could overwrite a
          decision taken in between; a stale context would write under another
          company's header. */}
      {writeGate.kind === 'not-sent' && (
        <HermesAdminNote role="alert">
          {writeGate.reason === 'missing-revision'
            ? t`Rien ne peut être envoyé : cette connexion a été lue sans sa révision, et un enregistrement sans elle pourrait écraser la décision de quelqu’un d’autre. Rechargez, puis réessayez.`
            : t`Rien ne peut être envoyé : la société affichée n’est plus la société active. Rechargez pour repartir du bon contexte.`}
        </HermesAdminNote>
      )}

      {/* Saving or deleting stops the bot delegations on the affected
          channels and creates new revisions. The operator reads that before
          the write, not after it. */}
      {pending !== 'none' && (
        <StyledConfirmation role="alertdialog" aria-label={t`Confirmation`}>
          <HermesAdminNote>
            {pending === 'save'
              ? t`Enregistrer cette connexion arrêtera les réponses automatiques sur ce canal : elles devront être réactivées explicitement. Une autorisation donnée pour l’ancienne connexion ne vaut pas pour la nouvelle.`
              : t`Supprimer cette connexion arrêtera les réponses automatiques sur ce canal : elles devront être réactivées explicitement.`}
          </HermesAdminNote>

          <HermesAdminNote>
            {t`Les réceptions et les réponses humaines continuent. Seule la délégation au bot s’arrête, et elle ne reprendra pas d’elle-même.`}
          </HermesAdminNote>

          <StyledActions>
            <Button
              type="button"
              variant="solid"
              size="sm"
              onClick={pending === 'save' ? confirmSave : confirmDelete}
            >
              {pending === 'save'
                ? t`Confirmer et arrêter les réponses automatiques`
                : t`Confirmer la suppression`}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPending('none')}
            >
              {t`Revenir en arrière`}
            </Button>
          </StyledActions>
        </StyledConfirmation>
      )}

      {subject.mode === 'create' && (
        <HermesAdminNote>
          {t`Un test porte sur une connexion enregistrée. Enregistrez d’abord, puis testez : il n’y a rien à joindre avant.`}
        </HermesAdminNote>
      )}

      {/* No probe exists for this channel in this build. Said before the
          operator wonders why the button does nothing. */}
      {subject.mode === 'edit' && !isProbable && (
        <HermesAdminNote role="status">
          {t`Aucun test de connexion n’est publié pour ce canal dans cette version. Rien ne peut être joint depuis ici, et rien n’est présenté comme vérifié pour autant.`}
        </HermesAdminNote>
      )}

      {/* One result per probe. A single verdict for mail would hide a broken
          direction behind a working one. */}
      {probes.map((probe) => (
        <HermesConnectionCheckNote
          key={probe}
          probe={probe}
          outcome={checkByProbe[probe]}
        />
      ))}

      {saveState.kind === 'saved' && (
        <>
          <HermesAdminNote role="status">
            {isNonEmptyString(saveState.verifiedAt)
              ? t`Enregistré, et le serveur a daté une vérification.`
              : t`Enregistré. Aucune vérification n’a eu lieu : la connexion reste « Configuré, à vérifier » jusqu’à un test daté.`}
          </HermesAdminNote>

          {/* No automatic resumption is offered: an automatic mode does not
              come back to life on its own. */}
          <HermesAdminNote role="status">
            {t`Les réponses automatiques de ce canal sont arrêtées. Rien ne les reprend automatiquement : il faut les réactiver dans les politiques du bot.`}
          </HermesAdminNote>
        </>
      )}

      {saveState.kind === 'saved-unread' && (
        <HermesAdminNote role="alert">
          {t`Enregistré côté serveur, mais la relecture qui doit suivre n’a pas abouti : la révision affichée n’est plus celle du serveur, et un enregistrement suivant serait refusé sur cette base. Rechargez pour repartir de ce que le serveur retient.`}
        </HermesAdminNote>
      )}

      {saveState.kind === 'not-sent' && (
        <HermesAdminNote role="alert">
          {saveState.reason === 'missing-revision'
            ? t`Rien n’a été envoyé, faute de la révision lue.`
            : t`Rien n’a été envoyé : le contexte de société n’était plus valable.`}
        </HermesAdminNote>
      )}

      {saveState.kind === 'refused' && (
        <HermesAdminNote role="alert">
          {isNonEmptyString(saveState.reason)
            ? t`Rien n’a été enregistré : ${saveState.reason}`
            : t`Rien n’a été enregistré.`}
        </HermesAdminNote>
      )}

      {saveState.kind === 'session-replaced' && (
        <HermesReloadRequest
          headline={t`Session remplacée : la session et le cookie natif ne désignent plus le même utilisateur, le même espace de travail ou la même appartenance. Rien n’a été enregistré.`}
          message={saveState.message}
          onRequestReload={onRequestReload}
        />
      )}

      {saveState.kind === 'unconfirmed' && (
        <HermesAdminNote role="alert">
          {t`La réponse du serveur n’a pas pu être lue : cet enregistrement est incertain. Rechargez pour voir ce qui a été retenu.`}
        </HermesAdminNote>
      )}
    </StyledForm>
  );
};
