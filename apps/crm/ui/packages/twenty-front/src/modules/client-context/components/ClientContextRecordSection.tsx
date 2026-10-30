import { styled } from '@linaria/react';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { ClientContextPanel } from '@/client-context/components/ClientContextPanel';
import { isClientContextRecordObject } from '@/client-context/constants/ClientContextRecordObjects';
import { useClientContextSources } from '@/client-context/hooks/useClientContextSources';

const StyledSection = styled.section`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: ${themeCssVariables.spacing[4]};
`;

type ClientContextRecordSectionProps = {
  recordId: string;
  objectNameSingular: string | undefined;
};

// The mountable form of the client context: one element to place on a record
// page, gated to the records the surface actually applies to.
//
// It queries nothing and reads nothing from the record store, so it cannot
// throw on a workspace where an object is absent — which is why it needs no
// equivalent of ProspectionObjectsGate.
export const ClientContextRecordSection = ({
  recordId,
  objectNameSingular,
}: ClientContextRecordSectionProps) => {
  const sources = useClientContextSources({
    recordId,
    objectNameSingular: objectNameSingular ?? '',
  });

  if (!isClientContextRecordObject(objectNameSingular)) {
    return null;
  }

  return (
    <StyledSection>
      <ClientContextPanel
        formResponses={sources.formResponses}
        bookings={sources.bookings}
      />
    </StyledSection>
  );
};
