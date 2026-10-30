import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useId, useState, type FormEvent } from 'react';
import { IconLock } from 'kovaa-lab-ui/icon';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { Button, Input } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import {
  HermesAdminNote,
  HermesAdminRuleNote,
} from '@/hermes-admin-ui/components/HermesAdminNote';
import { HermesReloadRequest } from '@/hermes-admin-ui/components/HermesReloadRequest';
import { type HermesAdminContextValidity } from '@/hermes-admin-ui/types/HermesAdminContext';
import { type HermesConnectionKind } from '@/hermes-admin-ui/types/HermesConnection';
import {
  HERMES_CONNECTION_FORM_EMPTY_VALUES,
  type HermesConnectionFormSubject,
  type HermesConnectionFormSubmission,
  type HermesConnectionFormValues,
  type HermesConnectionSaveState,
  type HermesConnectionTestState,
  type HermesNativeConnectedAccount,
} from '@/hermes-admin-ui/types/HermesConnectionForm';
import {
  hasHermesOwnSecretField,
  readHermesConnectionSecretPolicy,
  readHermesConnectionWriteGate,
  readHermesNativeAccountAddress,
  validateHermesConnectionForm,
  type HermesConnectionFormIssues,
} from '@/hermes-admin-ui/utils/hermesAdminWrite';
import {
  buildHermesSecretSubmission,
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
  saveState: HermesConnectionSaveState;
  testState: HermesConnectionTestState;
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
  saveState,
  testState,
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

  // The only place a typed secret lives, and only while this form is open. It
  // is never read back from the server and never put in browser storage.
  const [typedSecret, setTypedSecret] = useState('');

  const [issues, setIssues] = useState<HermesConnectionFormIssues>({});

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

  const kindLabel =
    subject.kind !== null
      ? kindLabels[subject.kind]
      : subject.mode === 'edit' && isNonEmptyString(subject.unknownKind)
        ? t`Type non reconnu : ${subject.unknownKind}`
        : t`Type non reconnu`;

  const secretPolicy = readHermesConnectionSecretPolicy(subject.kind);
  const showsSecretField = hasHermesOwnSecretField(secretPolicy);

  const secretRead = readHermesSecretField(
    subject.mode === 'edit' ? subject.hasStoredSecret : false,
  );

  const writeGate = readHermesConnectionWriteGate(subject, contextValidity);

  const isSaving = saveState.kind === 'saving';
  const isTesting = testState.kind === 'testing';

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

  // Read only, and a consequence of the chosen account rather than an input.
  const attachedAddress = readHermesNativeAccountAddress(
    nativeAccounts ?? [],
    values.nativeAccountId,
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const found = validateHermesConnectionForm(secretPolicy, values);

    setIssues(found);

    if (Object.keys(found).length > 0) {
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
      secret: showsSecretField
        ? buildHermesSecretSubmission(typedSecret)
        : { kind: 'unchanged' },
      expectedRevision: writeGate.expectedRevision,
    });
    // Nothing of the secret is kept once it has left.
    setTypedSecret('');
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
              disabled={isSaving}
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
              <option value="">{t`Choisir un compte connecté`}</option>
              {(nativeAccounts ?? []).map((account) => (
                <option key={account.id} value={account.id}>
                  {isNonEmptyString(account.label)
                    ? account.label
                    : isNonEmptyString(account.address)
                      ? account.address
                      : account.id}
                </option>
              ))}
            </StyledSelect>

            {(nativeAccounts ?? []).length === 0 && (
              <HermesAdminNote role="status">
                {t`Aucun compte connecté natif IMAP ou SMTP n’est disponible. Il faut en connecter un dans les comptes du produit : rien ne se saisit ici à sa place.`}
              </HermesAdminNote>
            )}

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
      ) : (
        <>
          <StyledFieldset>
            <StyledLabel htmlFor={labelId}>{t`Nom de la connexion`}</StyledLabel>
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
              {t`Adresse du service`}
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
        <StyledFieldset>
          <StyledLabel htmlFor={secretId}>
            {t`Secret (clé, jeton ou mot de passe)`}
          </StyledLabel>
          <Input
            id={secretId}
            type="password"
            value={typedSecret}
            onValueChange={setTypedSecret}
            disabled={isSaving}
            // No browser filling, storing or completing this field.
            autoComplete="new-password"
            spellCheck={false}
            placeholder={hermesSecretPlaceholder(secretRead)}
            aria-describedby={secretHelpId}
          />

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

          {/* The contract of this field, said out loud: the stored value never
              comes back, so it cannot be shown or checked — only replaced. */}
          <HermesAdminRuleNote id={secretHelpId}>
            {secretRead.kind === 'stored'
              ? t`La valeur enregistrée reste côté serveur : elle n’est jamais renvoyée au navigateur, donc ni affichée ni relue ici. Laissez ce champ vide pour la conserver telle quelle, ou saisissez une nouvelle valeur pour la remplacer.`
              : t`La valeur saisie partira vers le serveur, y restera, et ne sera jamais renvoyée au navigateur : elle ne pourra plus être relue depuis cet écran, seulement remplacée.`}
          </HermesAdminRuleNote>
        </StyledFieldset>
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
            interprets anything: it shows the result it is given. */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={isTesting}
          disabled={subject.mode === 'create'}
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

      {isTesting && (
        <HermesAdminNote role="status">
          {t`Test en cours côté serveur…`}
        </HermesAdminNote>
      )}

      {testState.kind === 'verified' && (
        <HermesAdminNote role="status">
          {isNonEmptyString(testState.verifiedAt)
            ? t`Le serveur a répondu que le test est passé et l’a daté.`
            : t`Le serveur a répondu que le test est passé, sans date. Sans date, cette connexion n’est pas présentée comme vérifiée.`}
        </HermesAdminNote>
      )}

      {testState.kind === 'failed' && (
        <HermesAdminNote role="alert">
          {isNonEmptyString(testState.errorCode)
            ? t`Test échoué : ${testState.errorCode}`
            : t`Test échoué, sans motif renvoyé.`}
        </HermesAdminNote>
      )}

      {testState.kind === 'refused' && (
        <HermesAdminNote role="alert">
          {isNonEmptyString(testState.reason)
            ? t`Test refusé : ${testState.reason}`
            : t`Test refusé. Rien n’a été vérifié.`}
        </HermesAdminNote>
      )}

      {testState.kind === 'unconfirmed' && (
        <HermesAdminNote role="alert">
          {t`La réponse du test n’a pas pu être lue : le résultat est inconnu, ni réussi ni échoué.`}
        </HermesAdminNote>
      )}

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
