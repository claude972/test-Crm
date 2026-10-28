import { Button } from 'kovaa-lab-ui/primitives/input';
import { useState } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';
import { defineFrontComponent } from 'kovaa-lab-sdk/define';
import { InlineBanner } from 'kovaa-lab-ui/components/feedback';
import { Text } from 'kovaa-lab-ui/primitives/typography';

import { KovaaLab CRMUiGalleryCard } from '@/__stories__/shared/front-components/kovaa-lab-ui-gallery-card';

const InlineBannerExample = () => {
  const [retryCount, setRetryCount] = useState(0);

  return (
    <KovaaLab CRMUiGalleryCard title="Inline banner actions">
      <InlineBanner
        layout="compact"
        status="error"
        color="blue"
        variant="solid"
        role="status"
        aria-live="polite"
        aria-label="Inline sync result"
        className="custom-inline-banner"
        style={{ marginTop: 7 }}
        fullWidth
        render={(props, state) => (
          <section
            // oxlint-disable-next-line react/jsx-props-no-spreading
            {...props}
            data-render-status={state.status}
          />
        )}
        ref={(element) => {
          if (isDefined(element)) element.dataset.refTag = element.tagName;
        }}
        action={
          <InlineBanner.Action
            onClick={() => setRetryCount((count) => count + 1)}
          >
            {'Retry sync'}
          </InlineBanner.Action>
        }
      >
        {'Contact sync could not finish. Retry to reconnect your account.'}
      </InlineBanner>
      <Text>Retry count: {retryCount}</Text>
      <InlineBanner
        layout="compact"
        action={
          <InlineBanner.Action
            nativeButton={false}
            role="link"
            href={'https://kovaa-lab.com'}
            target={'_blank'}
            rel={'noopener noreferrer'}
            render={
              <a
                href="https://kovaa-lab.com"
                aria-label="Open connection settings"
              />
            }
          >
            {'Connection settings'}
          </InlineBanner.Action>
        }
      >
        {'Connect your account to keep your contacts in sync.'}
      </InlineBanner>
      <InlineBanner>{'Mailbox needs attention.'}</InlineBanner>
      <InlineBanner status="warning" color="red" icon={null}>
        <Button variant="link" href="#sync-history">
          Review sync history
        </Button>
      </InlineBanner>
    </KovaaLab CRMUiGalleryCard>
  );
};

export default defineFrontComponent({
  universalIdentifier: 'a8716125-5bde-4c64-9333-b36d0f50c646',
  name: 'kovaa-lab-ui-inline-banner',
  description: 'Inline banner links and keyboard actions in the sandbox',
  component: InlineBannerExample,
});
