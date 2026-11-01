import { styled } from '@linaria/react';
import { useState } from 'react';
import { Button, Input } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import {
  useHermesWhatsappEnrollment,
  type HermesWhatsappEnrollmentScope,
} from '@/hermes-whatsapp-setup/hooks/useHermesWhatsappEnrollment';

const StyledSection = styled.section`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[4]};

  h2,
  p {
    margin: 0;
  }
  h2 {
    font-size: ${themeCssVariables.font.size.lg};
  }
`;
const StyledActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;
const StyledQr = styled.img`
  aspect-ratio: 1;
  background: white;
  height: auto;
  max-width: 100%;
  width: 240px;
`;

type HermesWhatsappSetupSectionProps = HermesWhatsappEnrollmentScope & {
  companyName: string | null;
  onReload: () => void;
};

export const HermesWhatsappSetupSection = ({
  companyName,
  onReload,
  ...scope
}: HermesWhatsappSetupSectionProps) => {
  const enrollment = useHermesWhatsappEnrollment(scope);
  const [method, setMethod] = useState<'qr' | 'code'>('qr');
  const { phase, read } = enrollment;
  const view = read?.view;
  const isReady = phase === 'ready';
  const isBusy = phase === 'requesting';
  const isOpen = isReady && view?.providerState === 'open';
  const canPair =
    isReady &&
    view !== undefined &&
    ['AWAITING_PAIRING', 'CONNECTING'].includes(view.state) &&
    !isOpen;
  const canStart =
    isReady &&
    view?.state === 'NOT_CONFIGURED' &&
    view.reasonCode !== 'WA_PROVISIONER_NOT_CONFIGURED';
  const canActivate =
    isOpen &&
    view?.ingressEnabled === false &&
    view.botMode === 'OFF' &&
    ['PAIRED_PENDING_ACTIVATION', 'ACTIVATING'].includes(view.state);
  const credential = canPair ? read?.credential : null;
  const phoneNumber = enrollment.phoneNumber.replace(/[\s()-]/g, '');
  const isPhoneValid = /^\+?[1-9]\d{6,14}$/.test(phoneNumber);

  const status = !isReady
    ? 'État à vérifier'
    : isOpen
      ? view?.state === 'ACTIVE' && view.ingressEnabled
        ? 'Appareil associé · réception activée'
        : 'Appareil associé · réception inactive'
      : view?.providerState === 'connecting'
        ? 'Association en attente'
        : view?.state === 'NOT_CONFIGURED'
          ? 'WhatsApp non connecté'
          : view?.state === 'UNAVAILABLE'
            ? 'WhatsApp indisponible'
            : view?.state === 'BLOCKED'
              ? 'Connexion à vérifier'
              : 'WhatsApp non associé';

  return (
    <StyledSection
      id="hermes-whatsapp"
      aria-labelledby="hermes-whatsapp-title"
      tabIndex={-1}
    >
      <h2 id="hermes-whatsapp-title">Connecter WhatsApp</h2>
      <p>
        {companyName ? `Pour ${companyName}.` : 'Pour la société active.'}{' '}
        Associez votre téléphone ici, puis activez la réception.
      </p>
      <p role="status">{status}</p>

      {isBusy && (
        <p role="status">
          {enrollment.operation === 'Status'
            ? 'Vérification de l’association…'
            : enrollment.operation === 'Activate'
              ? 'Activation de la réception…'
              : 'Préparation de l’association…'}
        </p>
      )}
      {phase === 'denied' && (
        <p role="alert">
          Votre session ou votre rôle ne permet pas de gérer cette connexion.
          Aucun code d’association n’est affiché.
        </p>
      )}
      {phase === 'stale' && (
        <p role="alert">
          La session ou les réglages ont changé. Rechargez les réglages avant de
          poursuivre.
        </p>
      )}
      {phase === 'unknown' && (
        <p role="alert">
          La demande est partie, mais son résultat est inconnu. Vérifiez l’état
          avant de demander une nouvelle association.
        </p>
      )}
      {phase === 'failed' && (
        <p role="alert">
          L’état de WhatsApp n’a pas pu être lu. Aucune association n’est
          supposée.
        </p>
      )}
      {phase === 'refused' && (
        <p role="alert">
          Le serveur a refusé cette action. Vérifiez les réglages et l’état de
          l’association avant de poursuivre ; aucune réussite n’est annoncée.
        </p>
      )}
      {view?.reasonCode === 'WA_PROVISIONER_NOT_CONFIGURED' && (
        <p>
          Le service de connexion WhatsApp n’est pas disponible pour cette
          société. Vous n’avez aucune clé technique à saisir.
        </p>
      )}
      {isReady && view?.state === 'PROVISIONING_UNCONFIRMED' && (
        <p role="alert">
          La préparation reste à confirmer. Vérifiez l’état ; ne créez pas une
          seconde connexion.
        </p>
      )}
      {isReady && view?.state === 'BLOCKED' && (
        <p role="alert">
          Les réglages existants doivent être vérifiés avant cette association.
          Ils ne seront pas remplacés automatiquement.
        </p>
      )}

      <StyledActions>
        {canStart && (
          <Button onClick={() => void enrollment.request('Start')}>
            Connecter mon téléphone
          </Button>
        )}
        <Button
          variant="outline"
          disabled={isBusy}
          onClick={() => void enrollment.request('Status')}
        >
          Vérifier l’association
        </Button>
        {['unknown', 'stale', 'failed', 'denied', 'refused'].includes(
          phase,
        ) && (
          <Button variant="outline" onClick={onReload}>
            Recharger les réglages
          </Button>
        )}
      </StyledActions>

      {canPair && (
        <>
          <StyledActions
            role="group"
            aria-label="Méthode d’association WhatsApp"
          >
            <Button
              variant="outline"
              aria-pressed={method === 'qr'}
              onClick={() => setMethod('qr')}
            >
              Scanner un QR
            </Button>
            <Button
              variant="outline"
              aria-pressed={method === 'code'}
              onClick={() => setMethod('code')}
            >
              Utiliser un code
            </Button>
          </StyledActions>
          {method === 'qr' ? (
            <>
              <p>
                Sur votre téléphone, ouvrez WhatsApp → Appareils connectés →
                Connecter un appareil, puis scannez le QR sur cet écran.
              </p>
              <Button
                variant="outline"
                onClick={() => void enrollment.request('Qr')}
              >
                Afficher ou actualiser le QR
              </Button>
              {credential?.qrDataUrl && (
                <StyledQr
                  src={credential.qrDataUrl}
                  alt="QR pour associer WhatsApp à cette société"
                />
              )}
            </>
          ) : (
            <>
              <label htmlFor="hermes-whatsapp-phone">
                Numéro WhatsApp avec indicatif du pays
              </label>
              <Input
                id="hermes-whatsapp-phone"
                type="tel"
                autoComplete="off"
                maxLength={24}
                placeholder="+33…"
                value={enrollment.phoneNumber}
                onValueChange={enrollment.setPhoneNumber}
              />
              <Button
                variant="outline"
                disabled={!isPhoneValid}
                onClick={() => void enrollment.request('Qr', phoneNumber)}
              >
                Obtenir un code d’association
              </Button>
              {credential?.pairingCode && (
                <output aria-label="Code d’association WhatsApp">
                  {credential.pairingCode}
                </output>
              )}
            </>
          )}
          <p>
            L’affichage du QR ou du code se ferme après un court délai.
            Actualisez-le si WhatsApp ne l’accepte plus ; sa présence ne
            confirme pas l’association.
          </p>
        </>
      )}

      {isOpen && (
        <p>
          Aucun échange de message n’a encore été validé par cet écran.
          L’association du téléphone et la réception sont deux étapes
          distinctes.
        </p>
      )}
      {isOpen && view?.botMode !== 'OFF' && (
        <p role="alert">
          Désactivez les réponses du bot dans « Réponses du bot » avant
          d’activer la réception.
        </p>
      )}
      {canActivate && (
        <Button onClick={() => void enrollment.request('Activate')}>
          Activer la réception des nouveaux messages
        </Button>
      )}
      {isReady && view?.state === 'ACTIVE' && view.ingressEnabled && (
        <p>
          La réception est activée. Les réponses du bot gardent leur propre
          réglage ; aucun message n’est envoyé automatiquement par cette
          association.
        </p>
      )}
    </StyledSection>
  );
};
