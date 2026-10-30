import { styled } from '@linaria/react';
import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { IconPaperclip } from 'kovaa-lab-ui/icon';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesMailboxInstantLabel } from '@/hermes-mailbox-ui/components/HermesMailboxInstantLabel';
import { HermesMailboxLoadNote } from '@/hermes-mailbox-ui/components/HermesMailboxLoadNote';
import { HermesMailboxNote } from '@/hermes-mailbox-ui/components/HermesMailboxNote';
import { type HermesMailboxLoad } from '@/hermes-mailbox-ui/types/HermesMailboxLoad';
import { type HermesMailboxThreadSummary } from '@/hermes-mailbox-ui/types/HermesMailboxThread';
import { formatHermesMailboxAddress } from '@/hermes-mailbox-ui/utils/parseHermesMailboxAddress';
import { readHermesMailboxCount } from '@/hermes-mailbox-ui/utils/readHermesMailboxCount';

const StyledPanel = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  min-height: 0;
  min-width: 0;
`;

const StyledTitle = styled.h2`
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0.04em;
  margin: 0;
  text-transform: uppercase;
`;

const StyledList = styled.ul`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  padding: 0;
`;

const StyledItem = styled.li`
  min-width: 0;

  & + & {
    border-top: 1px solid ${themeCssVariables.border.color.light};
  }
`;

// State never rests on colour: aria-current and the left edge carry selection,
// and an unread thread also gets a written badge and a heavier subject.
const StyledThreadButton = styled.button`
  background: transparent;
  border: none;
  border-left: 3px solid transparent;
  cursor: pointer;
  display: grid;
  font-family: inherit;
  gap: ${themeCssVariables.spacing[1]};
  margin: 0;
  min-width: 0;
  padding: ${themeCssVariables.spacing[2]};
  text-align: left;
  width: 100%;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }

  &[aria-current='true'] {
    border-left-color: ${themeCssVariables.accent.primary};
    background: ${themeCssVariables.background.transparent.light};
  }

  &[data-unread='true'] {
    border-left-color: ${themeCssVariables.border.color.strong};
  }

  &[aria-current='true'][data-unread='true'] {
    border-left-color: ${themeCssVariables.accent.primary};
  }

  &:focus-visible {
    outline: 1px solid ${themeCssVariables.border.color.strong};
    outline-offset: -1px;
  }
`;

const StyledTopRow = styled.span`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  min-width: 0;
`;

const StyledCorrespondents = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.xs};
  min-width: 0;
  overflow-wrap: anywhere;
`;

const StyledDate = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledSubject = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  min-width: 0;
  overflow-wrap: anywhere;

  [data-unread='true'] & {
    font-weight: ${themeCssVariables.font.weight.semiBold};
  }
`;

const StyledBottomRow = styled.span`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-wrap: wrap;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledUnreadBadge = styled.span`
  border: 1px solid ${themeCssVariables.border.color.strong};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.xxs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0.04em;
  padding: 0 ${themeCssVariables.spacing[1]};
  text-transform: uppercase;
`;

const StyledAttachmentMark = styled.span`
  align-items: center;
  display: inline-flex;
  gap: ${themeCssVariables.spacing[1]};

  & > svg {
    block-size: calc(${themeCssVariables.icon.size.sm} * 1px);
    flex-shrink: 0;
    inline-size: calc(${themeCssVariables.icon.size.sm} * 1px);
    stroke-width: ${themeCssVariables.icon.stroke.sm};
  }
`;

type HermesMailboxThreadListPanelProps = {
  threads: HermesMailboxLoad<HermesMailboxThreadSummary[]>;
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  // Offered on an expired page of results.
  onReloadThreads?: () => void;
  // Already translated: the name of the folder being listed.
  folderLabel: string | null;
};

// The thread list. Every figure on a row is three-valued: an unread state the
// provider does not publish is not shown as read, and a count it did not send
// is not shown as 1. The row says the figure is unknown.
export const HermesMailboxThreadListPanel = ({
  threads,
  selectedThreadId,
  onSelectThread,
  onReloadThreads,
  folderLabel,
}: HermesMailboxThreadListPanelProps) => {
  const { t } = useLingui();

  const describeCorrespondents = (
    thread: HermesMailboxThreadSummary,
  ): string => {
    if (thread.correspondents.length === 0) {
      return t`No correspondent given`;
    }

    return thread.correspondents.map(formatHermesMailboxAddress).join(', ');
  };

  // Plural selection goes through <Plural>, so no locale ends up with
  // "1 messages" and no sentence is assembled from fragments.
  const renderMessageCount = (thread: HermesMailboxThreadSummary) => {
    const count = readHermesMailboxCount(thread.messageCount);

    if (count.kind === 'unknown') {
      return <span>{t`Message count unknown`}</span>;
    }

    return (
      <span>
        <Plural
          value={count.value}
          _0="No message"
          one="# message"
          other="# messages"
        />
      </span>
    );
  };

  return (
    <StyledPanel aria-label={t`Threads`}>
      <StyledTitle>
        {isNonEmptyString(folderLabel) ? folderLabel : t`Threads`}
      </StyledTitle>

      <HermesMailboxLoadNote
        unavailableHeadline={t`Threads unavailable.`}
        load={threads}
        onReload={onReloadThreads}
      />

      {threads.kind === 'ready' &&
        (threads.value.length === 0 ? (
          <HermesMailboxNote>
            <Trans>No thread in this folder.</Trans>
          </HermesMailboxNote>
        ) : (
          <StyledList>
            {threads.value.map((thread) => {
              const isSelected = thread.id === selectedThreadId;
              const isUnread = thread.isUnread === true;

              return (
                <StyledItem key={thread.id}>
                  <StyledThreadButton
                    type="button"
                    aria-current={isSelected ? 'true' : undefined}
                    data-unread={isUnread ? 'true' : 'false'}
                    onClick={() => onSelectThread(thread.id)}
                  >
                    <StyledTopRow>
                      {/* Provider-sourced. Rendered as text. */}
                      <StyledCorrespondents>
                        {describeCorrespondents(thread)}
                      </StyledCorrespondents>
                      <StyledDate>
                        <HermesMailboxInstantLabel
                          value={thread.lastMessageAt}
                          density="short"
                        />
                      </StyledDate>
                    </StyledTopRow>

                    <StyledSubject>
                      {isNonEmptyString(thread.subject)
                        ? thread.subject
                        : t`No subject`}
                    </StyledSubject>

                    <StyledBottomRow>
                      {isUnread && (
                        <StyledUnreadBadge>{t`Unread`}</StyledUnreadBadge>
                      )}

                      {/* Said out loud rather than assumed read. */}
                      {thread.isUnread === null && (
                        <span>{t`Read state unknown`}</span>
                      )}

                      {renderMessageCount(thread)}

                      {thread.hasAttachments === true && (
                        <StyledAttachmentMark>
                          <IconPaperclip aria-hidden="true" />
                          {t`Attachments`}
                        </StyledAttachmentMark>
                      )}

                      {thread.hasAttachments === null && (
                        <span>{t`Attachments unknown`}</span>
                      )}
                    </StyledBottomRow>
                  </StyledThreadButton>
                </StyledItem>
              );
            })}
          </StyledList>
        ))}
    </StyledPanel>
  );
};
