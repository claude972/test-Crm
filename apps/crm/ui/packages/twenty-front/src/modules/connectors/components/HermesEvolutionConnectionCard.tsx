import { ConnectorPanel } from '@/connectors/components/ConnectorPanel';
import { EVOLUTION_WHATSAPP_CONNECTOR } from '@/connectors/constants/EvolutionWhatsappConnector';
import { type ConnectorReadState } from '@/connectors/types/ConnectorReadState';

type HermesEvolutionConnectionCardProps = {
  state: ConnectorReadState;
};

// The WhatsApp connector backed by the hermesEvolutionConnection contract. It
// adds no presentation of its own: the shared panel decides how a connector
// looks, so this one cannot drift into looking healthier than the rest.
export const HermesEvolutionConnectionCard = ({
  state,
}: HermesEvolutionConnectionCardProps) => (
  <ConnectorPanel descriptor={EVOLUTION_WHATSAPP_CONNECTOR} state={state} />
);
