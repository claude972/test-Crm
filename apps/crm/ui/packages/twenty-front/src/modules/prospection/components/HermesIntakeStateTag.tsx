import { useLingui } from '@lingui/react/macro';
import {
  IconCheck,
  IconCircleOff,
  IconHelpCircle,
  IconLoader,
  IconLock,
  IconPlug,
  IconWebhook,
  type IconComponent,
} from 'kovaa-lab-ui/icon';
import {
  Tag,
  type TagColor,
  type TagProps,
} from 'kovaa-lab-ui/primitives/data-display';

import { type HermesIntakeUnreportedState } from '@/prospection/types/HermesIntakeState';

type HermesIntakePresentation = {
  color: TagColor;
  variant: NonNullable<TagProps['variant']>;
  borderStyle: NonNullable<TagProps['borderStyle']>;
  Icon: IconComponent;
  label: string;
};

type HermesIntakeStateTagProps = {
  // The five cases that carry no endpoint. A reported endpoint's acceptance is
  // HermesIntakeAcceptanceTag's job, so this badge can never be asked to
  // describe a state it has no facts for.
  state: HermesIntakeUnreportedState;
};

// What the client knows when it has no entry point to show. Every case carries
// its own icon and its own word, so none of them can be mistaken for another
// by a reader who does not see the colour. A dashed border only paints under
// variant="outline", which is why the three uncertain cases use that variant.
export const HermesIntakeStateTag = ({ state }: HermesIntakeStateTagProps) => {
  const { t } = useLingui();

  const presentation = ((): HermesIntakePresentation => {
    switch (state.kind) {
      case 'awaiting-contract':
        // The gap is the client's, and the label says so rather than
        // describing the workspace.
        return {
          color: 'gray',
          variant: 'outline',
          borderStyle: 'dashed',
          Icon: IconWebhook,
          label: t`Entry point state not published`,
        };
      case 'loading':
        return {
          color: 'gray',
          variant: 'outline',
          borderStyle: 'dashed',
          Icon: IconLoader,
          label: t`Checking…`,
        };
      case 'denied':
        return {
          color: 'gray',
          variant: 'outline',
          borderStyle: 'solid',
          Icon: IconLock,
          label: t`Not authorised`,
        };
      case 'not-configured':
        return {
          color: 'gray',
          variant: 'outline',
          borderStyle: 'solid',
          Icon: IconPlug,
          label: t`No entry point delegated`,
        };
      case 'unreadable':
        return {
          color: 'gray',
          variant: 'outline',
          borderStyle: 'dashed',
          Icon: IconHelpCircle,
          label: t`State unknown`,
        };
    }
  })();

  const { color, variant, borderStyle, Icon, label } = presentation;

  return (
    // truncate={false}: every label here carries the distinction, and a cut
    // one would read as another state.
    <Tag
      color={color}
      variant={variant}
      borderStyle={borderStyle}
      startIcon={<Icon />}
      weight="medium"
      truncate={false}
    >
      {label}
    </Tag>
  );
};

type HermesIntakeAcceptanceTagProps = {
  // Null when the server did not say. Never rounded up to accepting, and
  // never down to refusing.
  isAccepting: boolean | null;
};

// One structure's entry point, once the server has reported it. Deliberately a
// separate vocabulary from the badge above: "accepting" is a fact about the
// endpoint, while every label above is a fact about what the client knows.
export const HermesIntakeAcceptanceTag = ({
  isAccepting,
}: HermesIntakeAcceptanceTagProps) => {
  const { t } = useLingui();

  const presentation: HermesIntakePresentation =
    isAccepting === true
      ? {
          color: 'jade',
          variant: 'soft',
          borderStyle: 'solid',
          Icon: IconCheck,
          label: t`Accepting collections`,
        }
      : isAccepting === false
        ? {
            color: 'red',
            variant: 'soft',
            borderStyle: 'solid',
            Icon: IconCircleOff,
            label: t`Not accepting collections`,
          }
        : {
            color: 'gray',
            variant: 'outline',
            borderStyle: 'dashed',
            Icon: IconHelpCircle,
            label: t`Acceptance unknown`,
          };

  return (
    <Tag
      color={presentation.color}
      variant={presentation.variant}
      borderStyle={presentation.borderStyle}
      startIcon={<presentation.Icon />}
      weight="medium"
      truncate={false}
    >
      {presentation.label}
    </Tag>
  );
};
