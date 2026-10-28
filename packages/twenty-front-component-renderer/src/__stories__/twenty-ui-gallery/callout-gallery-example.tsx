import { createElement, useState } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Callout } from 'kovaa-lab-ui/components/feedback';
import { IconAlertTriangle } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { Text } from 'kovaa-lab-ui/primitives/typography';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

export const CalloutGalleryExample = () => {
  const [dismissRequests, setDismissRequests] = useState(0);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  return (
    <>
      <Callout
        title={<Text render={<span />}>Import needs review</Text>}
        description={
          <Text render={<span />}>
            Review{' '}
            <Button variant="link" href="#records">
              missing records
            </Button>
            .
          </Text>
        }
        icon={
          <IconAlertTriangle
            size={themeCssVariables.icon.size.md}
            aria-label="Import warning"
          />
        }
        action={
          <>
            <Callout.Action
              onClick={() => setRetryAttempts((count) => count + 1)}
            >
              Retry callout
            </Callout.Action>
            <Button disabled>Unavailable action</Button>
          </>
        }
        status="warning"
        color="blue"
        onDismiss={() => setDismissRequests((count) => count + 1)}
        closeLabel="Request dismissal"
        className="custom-callout"
        style={{ marginTop: 7 }}
        aria-label="Import notice"
        render={<section data-composed="true" />}
        ref={(element) => {
          if (isDefined(element)) element.dataset.refTag = element.tagName;
        }}
      />
      <Text>Dismiss requests: {dismissRequests}</Text>
      <Text>Retry attempts: {retryAttempts}</Text>
      {isVisible && (
        <Callout
          title="Caller-owned notice"
          onDismiss={() => setIsVisible(false)}
          closeLabel="Dismiss controlled notice"
          role="status"
          aria-live="polite"
          aria-label="Controlled notice"
          render={(props, state) =>
            createElement('article', {
              ...props,
              'data-render-status': state.status,
            })
          }
          ref={(element) => {
            if (isDefined(element)) element.dataset.refTag = element.tagName;
          }}
        />
      )}
      <Button onClick={() => setIsVisible(true)}>Show callout</Button>
      <Callout title="Persistent notice" icon={null} />
    </>
  );
};
