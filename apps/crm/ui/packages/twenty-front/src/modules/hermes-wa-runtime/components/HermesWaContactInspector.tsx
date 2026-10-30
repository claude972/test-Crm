import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Link } from 'react-router-dom';
import {
  IconCircleOff,
  IconHelpCircle,
  IconUser,
  IconUserPlus,
} from 'kovaa-lab-ui/icon';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';
import { AppPath, CoreObjectNameSingular } from 'kovaa-lab-shared/types';
import { getAppPath } from 'kovaa-lab-shared/utils';

import { HermesWaNote } from '@/hermes-wa-ui/components/HermesWaNote';

import { type HermesWaContactRead } from '@/hermes-wa-runtime/types/HermesWaContactMatch';

const StyledInspector = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  justify-items: start;
`;

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

type HermesWaContactInspectorProps = {
  contact: HermesWaContactRead;
  // Opens the native Person form prefilled with the phone. Absent means this
  // screen cannot open it — which is said in words rather than offered as a
  // button that does nothing.
  onCreateContactRequested?: (phoneNumber: string) => void;
  // Opens a review of an ambiguous match. Absent means the same thing.
  onReviewRequested?: () => void;
};

// The CRM side of one conversation: who the contact is, where that answer came
// from, and what may be done about it.
//
// The attachment is read-only on the server side, and this component honours
// that. Nothing here merges two contacts, nothing creates an opportunity, and
// nothing writes a link. The only write offered is the native Person form, and
// only for a contact the server said it did not match.
//
// The three statuses get three different sentences, because they ask for three
// different things:
//   MATCHED   — a contact to open.
//   UNMATCHED — nobody to open, and a number to start a Person from.
//   AMBIGUOUS — more than one candidate. A creation here would be a guess
//               between real people, so a review is offered instead.
// An unpublished or absent status reads as unknown, which is NOT the same as
// UNMATCHED: "we do not know" and "there is no contact" send the operator to
// different places, so they never share a sentence.
export const HermesWaContactInspector = ({
  contact,
  onCreateContactRequested,
  onReviewRequested,
}: HermesWaContactInspectorProps) => {
  const { t } = useLingui();

  return (
    <StyledInspector>
      <StyledRow>
        {contact.action.kind === 'open' ? (
          <StyledLink
            to={getAppPath(AppPath.RecordShowPage, {
              objectNameSingular: CoreObjectNameSingular.Person,
              objectRecordId: contact.action.personId,
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

        {/* The provenance, in the server's own terms. A known status is named;
            an unpublished one is shown verbatim so the gap is reportable. */}
        {contact.match.kind === 'known' ? (
          <Tag
            color="gray"
            variant="soft"
            truncate={false}
            startIcon={<IconHelpCircle />}
          >
            {contact.match.status === 'MATCHED'
              ? t`Matched by the server`
              : contact.match.status === 'UNMATCHED'
                ? t`No match found by the server`
                : t`Several possible contacts`}
          </Tag>
        ) : (
          contact.match.raw !== null && (
            <Tag
              color="gray"
              variant="soft"
              truncate={false}
              startIcon={<IconHelpCircle />}
            >
              {contact.match.raw}
            </Tag>
          )
        )}
      </StyledRow>

      {contact.match.kind === 'unknown' && (
        <HermesWaNote>
          <Trans>
            The server did not publish a match status for this conversation, so
            whether it has a contact is unknown.
          </Trans>
        </HermesWaNote>
      )}

      {contact.action.kind === 'create' &&
        (onCreateContactRequested === undefined ? (
          <HermesWaNote>
            <Trans>
              This conversation has no contact. Creating one is not available
              from this screen.
            </Trans>
          </HermesWaNote>
        ) : (
          <Button
            variant="outline"
            size="sm"
            startIcon={<IconUserPlus />}
            onClick={() => {
              // The phone was captured into the read before this render, and
              // it is the conversation's own handle — not a value re-read from
              // anything that may since have moved.
              onCreateContactRequested(
                contact.action.kind === 'create'
                  ? contact.action.phoneNumber
                  : '',
              );
            }}
          >
            {t`Create a contact from this number`}
          </Button>
        ))}

      {contact.action.kind === 'review' && (
        <>
          <HermesWaNote>
            <Trans>
              The server found more than one possible contact for this number.
              No contact is created automatically and nothing is merged.
            </Trans>
          </HermesWaNote>
          {onReviewRequested !== undefined && (
            <Button variant="outline" size="sm" onClick={onReviewRequested}>
              {t`Review the possible contacts`}
            </Button>
          )}
        </>
      )}
    </StyledInspector>
  );
};
