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

import { type HermesIntakeReadState } from '@/prospection/types/HermesIntakeState';

type HermesIntakePresentation = {
  color: TagColor;
  variant: NonNullable<TagProps['variant']>;
  borderStyle: NonNullable<TagProps['borderStyle']>;
  Icon: IconComponent;
  label: string;
};

type HermesIntakeStateTagProps = {
  state: HermesIntakeReadState;
};

// One badge for the authenticated entry point, whatever the client happens to
// know about it. Every case carries its own icon and its own word, so none of
// them can be mistaken for another by a reader who does not see the colour.
// A dashed border only paints under variant="outline", which is why the three
// uncertain cases use that variant.
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
          label: t`Entry point contract not published`,
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
          label: t`Not configured`,
        };
      case 'unreadable':
        return {
          color: 'gray',
          variant: 'outline',
          borderStyle: 'dashed',
          Icon: IconHelpCircle,
          label: t`Status unknown`,
        };
      case 'reported':
        // An unknown acceptance is never rounded up to an accepting entry
        // point, and never down to a refusing one.
        return state.endpoint.isAccepting === true
          ? {
              color: 'jade',
              variant: 'soft',
              borderStyle: 'solid',
              Icon: IconCheck,
              label: t`Accepting collections`,
            }
          : state.endpoint.isAccepting === false
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
                label: t`Reported, acceptance unknown`,
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
