import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { MessagingInboxDiagnostic } from '@/messaging-inbox/components/MessagingInboxDiagnostic';
import { MessagingInboxNote } from '@/messaging-inbox/components/MessagingInboxNote';
import { type MessagingInboxCursorList } from '@/messaging-inbox/hooks/useMessagingInboxCursorList';

const StyledFooter = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  justify-items: start;
  padding: ${themeCssVariables.spacing[2]} 0;
`;

type MessagingInboxLoadMoreProps<TItem> = {
  list: MessagingInboxCursorList<TItem>;
};

// The real cursor walk. The button appears only when the server handed back a
// nextCursor, so it is never a control that does nothing; when there is no
// cursor there is no button and no claim that the list is complete either.
export const MessagingInboxLoadMore = <TItem,>({
  list,
}: MessagingInboxLoadMoreProps<TItem>) => {
  const { t } = useLingui();

  const { nextCursor, isLoadingMore, loadMoreFailure, loadMoreProblem } = list;

  const hasFailure =
    isDefined(loadMoreFailure) || isDefined(loadMoreProblem);

  if (!isNonEmptyString(nextCursor)) {
    return hasFailure ? (
      <StyledFooter>
        <MessagingInboxNote role="alert">
          <Trans>Could not load more.</Trans>
        </MessagingInboxNote>
        <MessagingInboxDiagnostic
          message={loadMoreFailure?.message ?? null}
        />
      </StyledFooter>
    ) : null;
  }

  if (list.hasReachedPageLimit) {
    return (
      <StyledFooter>
        <MessagingInboxNote>
          <Trans>Page limit reached. Refresh to start again.</Trans>
        </MessagingInboxNote>
      </StyledFooter>
    );
  }

  return (
    <StyledFooter>
      {isDefined(loadMoreFailure) && loadMoreFailure.kind === 'denied' ? (
        <MessagingInboxNote role="alert">
          <Trans>Not authorised to load more.</Trans>
        </MessagingInboxNote>
      ) : (
        <Button
          variant="outline"
          size="sm"
          loading={isLoadingMore}
          onClick={() => list.loadMore(nextCursor)}
        >
          {t`Load more`}
        </Button>
      )}

      {hasFailure &&
        (!isDefined(loadMoreFailure) || loadMoreFailure.kind !== 'denied') && (
          <MessagingInboxNote role="alert">
            <Trans>Could not load more.</Trans>
          </MessagingInboxNote>
        )}

      <MessagingInboxDiagnostic message={loadMoreFailure?.message ?? null} />
    </StyledFooter>
  );
};
