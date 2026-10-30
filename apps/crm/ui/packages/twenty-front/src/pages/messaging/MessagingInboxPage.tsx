import { useLingui } from '@lingui/react/macro';
import { IconMessage } from 'kovaa-lab-ui/icon';

import { MessagingInboxScreen } from '@/messaging-inbox/components/MessagingInboxScreen';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';

// Route component for the unified inbox.
//
// It reads the three published hermesInbox operations and nothing else. It is
// deliberately separate from modules/activities/emails, which shows the CRM's
// own message records on a contact or a company: that surface is about records
// already in the workspace, this one about the conversations the connectors
// carry.
export const MessagingInboxPage = () => {
  const { t } = useLingui();

  return (
    <PageCardLayout
      header={<PageCardHeader icon={<IconMessage />} title={t`Messaging`} />}
    >
      <MessagingInboxScreen />
    </PageCardLayout>
  );
};
