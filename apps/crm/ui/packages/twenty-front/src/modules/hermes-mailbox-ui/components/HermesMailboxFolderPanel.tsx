import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { MOBILE_VIEWPORT, themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesMailboxLoadNote } from '@/hermes-mailbox-ui/components/HermesMailboxLoadNote';
import { useHermesMailboxFolderLabels } from '@/hermes-mailbox-ui/hooks/useHermesMailboxFolderLabels';
import { HermesMailboxNote } from '@/hermes-mailbox-ui/components/HermesMailboxNote';
import { type HermesMailboxFolder } from '@/hermes-mailbox-ui/types/HermesMailboxFolder';
import { type HermesMailboxLoad } from '@/hermes-mailbox-ui/types/HermesMailboxLoad';
import { readHermesMailboxCount } from '@/hermes-mailbox-ui/utils/readHermesMailboxCount';

const StyledPanel = styled.nav`
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
  gap: 1px;
  list-style: none;
  margin: 0;
  min-width: 0;
  padding: ${themeCssVariables.spacing[1]};

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    flex-direction: row;
    flex-wrap: wrap;
  }
`;

const StyledItem = styled.li`
  min-width: 0;

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    flex: 0 0 auto;
  }
`;

// Selection holds without colour: aria-current, a thicker left edge, and a
// heavier label.
const StyledFolderButton = styled.button`
  align-items: baseline;
  background: transparent;
  border: none;
  border-left: 2px solid transparent;
  border-radius: ${themeCssVariables.border.radius.xs};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  margin: 0;
  min-width: 0;
  padding: ${themeCssVariables.spacing[1.5]} ${themeCssVariables.spacing[2]};
  text-align: left;
  width: 100%;

  &:hover:not(:disabled) {
    background: ${themeCssVariables.background.transparent.light};
  }

  &[aria-current='true'] {
    border-left-color: ${themeCssVariables.accent.primary};
    color: ${themeCssVariables.font.color.primary};
    font-weight: ${themeCssVariables.font.weight.semiBold};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  &:focus-visible {
    outline: 1px solid ${themeCssVariables.border.color.strong};
    outline-offset: ${themeCssVariables.spacing[0.5]};
  }
`;

const StyledFolderName = styled.span`
  min-width: 0;
  overflow-wrap: anywhere;
`;

const StyledFolderCount = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.xs};
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.regular};
`;

type HermesMailboxFolderPanelProps = {
  folders: HermesMailboxLoad<HermesMailboxFolder[]>;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
  // The address this mailbox reads, when the parent knows it. A mailbox whose
  // own address is unknown says so: it is the fact the reply computation
  // depends on, so hiding its absence would hide why a reply looks wrong.
  mailboxAddress: string | null;
};

// The folder panel. An unknown count is written out as unknown, never as "0",
// which an operator would read as "nothing waiting" and stop looking.
export const HermesMailboxFolderPanel = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  mailboxAddress,
}: HermesMailboxFolderPanelProps) => {
  const { t, i18n } = useLingui();
  const { describeFolder } = useHermesMailboxFolderLabels();

  // Unread first: it is the figure somebody acts on. If neither figure came
  // back, the folder says so rather than showing a number nobody sent.
  const describeCount = (folder: HermesMailboxFolder): string => {
    const unread = readHermesMailboxCount(folder.counts.unread);

    if (unread.kind === 'known') {
      return t`${i18n.number(unread.value)} unread`;
    }

    const total = readHermesMailboxCount(folder.counts.total);

    if (total.kind === 'known') {
      return t`${i18n.number(total.value)} in total, unread count unknown`;
    }

    return t`Count unknown`;
  };

  return (
    <StyledPanel aria-label={t`Mail folders`}>
      <StyledTitle>{t`Folders`}</StyledTitle>

      {isNonEmptyString(mailboxAddress) ? (
        <HermesMailboxNote>{mailboxAddress}</HermesMailboxNote>
      ) : (
        <HermesMailboxNote>
          <Trans>This mailbox's own address is unknown.</Trans>
        </HermesMailboxNote>
      )}

      <HermesMailboxLoadNote
        unavailableHeadline={t`Folders unavailable.`}
        load={folders}
      />

      {folders.kind === 'ready' &&
        (folders.value.length === 0 ? (
          <HermesMailboxNote>
            <Trans>No folder on this mailbox.</Trans>
          </HermesMailboxNote>
        ) : (
          <StyledList>
            {folders.value.map((folder) => {
              const isSelected = folder.id === selectedFolderId;

              return (
                <StyledItem key={folder.id}>
                  <StyledFolderButton
                    type="button"
                    aria-current={isSelected ? 'true' : undefined}
                    onClick={() => onSelectFolder(folder.id)}
                  >
                    <StyledFolderName>
                      {describeFolder(folder)}
                    </StyledFolderName>
                    <StyledFolderCount>
                      {describeCount(folder)}
                    </StyledFolderCount>
                  </StyledFolderButton>
                </StyledItem>
              );
            })}
          </StyledList>
        ))}
    </StyledPanel>
  );
};
