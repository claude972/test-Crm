import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { Link } from 'react-router-dom';
import { IconCircleOff, IconHelpCircle, IconUser } from 'kovaa-lab-ui/icon';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { themeCssVariables } from 'kovaa-lab-ui/theme';
import { AppPath, CoreObjectNameSingular } from 'kovaa-lab-shared/types';
import { getAppPath } from 'kovaa-lab-shared/utils';

const StyledRow = styled.span`
  align-items: center;
  display: inline-flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledLink = styled(Link)`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  text-decoration: none;
  width: fit-content;

  &:hover {
    color: ${themeCssVariables.font.color.primary};
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 1px solid ${themeCssVariables.border.color.strong};
    outline-offset: ${themeCssVariables.spacing[0.5]};
  }

  & > svg {
    block-size: calc(${themeCssVariables.icon.size.sm} * 1px);
    flex-shrink: 0;
    inline-size: calc(${themeCssVariables.icon.size.sm} * 1px);
    stroke-width: ${themeCssVariables.icon.stroke.sm};
  }
`;

type MessagingInboxContactLinkProps = {
  personId: string | null;
  // Published as a field, with no published value set. Shown verbatim.
  personMatchStatus: string | null;
};

// `personId` is optional in the contract: a conversation can be attached to no
// CRM contact at all.
//
// When it is absent the screen says so and stops there. It does not search for
// a contact by handle and does not offer to create one — the server never
// creates or merges a contact, and an ambiguous or archived match is
// deliberately left unlinked, so an absent link is an answer.
//
// personMatchStatus is the server's own word for why. Its value set is not
// published, so it is displayed as it arrived and never interpreted.
export const MessagingInboxContactLink = ({
  personId,
  personMatchStatus,
}: MessagingInboxContactLinkProps) => {
  const { t } = useLingui();

  return (
    <StyledRow>
      {isNonEmptyString(personId) ? (
        <StyledLink
          to={getAppPath(AppPath.RecordShowPage, {
            objectNameSingular: CoreObjectNameSingular.Person,
            objectRecordId: personId,
          })}
        >
          <IconUser />
          {t`Open contact`}
        </StyledLink>
      ) : (
        <Tag
          color="gray"
          variant="outline"
          borderStyle="dashed"
          truncate={false}
          startIcon={<IconCircleOff />}
        >
          {t`No linked contact`}
        </Tag>
      )}

      {isNonEmptyString(personMatchStatus) && (
        <Tag
          color="gray"
          variant="soft"
          truncate={false}
          startIcon={<IconHelpCircle />}
        >
          {personMatchStatus}
        </Tag>
      )}
    </StyledRow>
  );
};
