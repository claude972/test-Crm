import { useState } from 'react';
import { defineFrontComponent } from 'kovaa-lab-sdk/define';
import {
  IconButton,
  LightButton,
  LightIconButton,
  MainButton,
} from 'kovaa-lab-ui/components/input';
import { AnimatedIconCrossfade } from 'kovaa-lab-ui/components/layout';
import { IconGripVertical, IconPencil, IconPlus, IconX } from 'kovaa-lab-ui/icon';
import { Button, ButtonGroup } from 'kovaa-lab-ui/primitives/input';
import { ListItem } from 'kovaa-lab-ui/primitives/navigation';
import 'kovaa-lab-ui/style.css';
import { ThemeProvider, themeCssVariables } from 'kovaa-lab-ui/theme';
import { Text } from 'kovaa-lab-ui/primitives/typography';

const ButtonControls = () => {
  const [activations, setActivations] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const handleClick = () => setActivations((count) => count + 1);
  return (
    <ThemeProvider colorScheme="light">
      <Button
        size="sm"
        aria-expanded={isEditing ? 'true' : 'false'}
        onClick={() => setIsEditing(!isEditing)}
        startIcon={
          <AnimatedIconCrossfade
            isActive={isEditing}
            activeIcon={<IconX size={14} />}
            inactiveIcon={<IconPencil size={14} />}
          />
        }
      >
        Edit actions
      </Button>
      <Button
        color="accent"
        variant="solid"
        startIcon={<IconPlus />}
        onClick={handleClick}
      >
        Create record
      </Button>
      <Text
        data-testid="inherited-button-surface"
        style={{
          background: themeCssVariables.color.blue,
          color: themeCssVariables.font.color.onAccent,
        }}
      >
        <Button color="inherit" variant="outline" startIcon={<IconPlus />}>
          Inherited action
        </Button>
      </Text>
      <Button disabled onClick={handleClick}>
        Disabled button
      </Button>
      <MainButton loading={loading} onClick={() => setLoading(true)}>
        Save changes
      </MainButton>
      <LightButton onClick={() => setLoading(false)}>
        Complete request
      </LightButton>
      <Button
        variant="link"
        href="https://kovaa-lab.com"
        target="_blank"
        rel="noreferrer"
      >
        Documentation
      </Button>
      <ButtonGroup aria-label="Actions" size="sm">
        <Button onClick={handleClick}>First action</Button>
        <Button onClick={handleClick}>Second action</Button>
      </ButtonGroup>
      <ButtonGroup framed attached={false} aria-label="Icon actions">
        <LightIconButton size="xs" aria-label="Add item" onClick={handleClick}>
          <IconPlus />
        </LightIconButton>
        <span>
          <LightIconButton
            size="xs"
            aria-label="Unavailable item"
            disabled
            onClick={handleClick}
          >
            <IconPlus />
          </LightIconButton>
        </span>
      </ButtonGroup>
      <IconButton
        aria-label="Send"
        shape="round"
        size="xs"
        variant="solid"
        color="accent"
      >
        <IconPlus />
      </IconButton>
      <ListItem
        actionsVisibility="always"
        actions={
          <ButtonGroup attached={false}>
            <LightIconButton aria-label="Add to record" onClick={handleClick}>
              <IconPlus />
            </LightIconButton>
            <span>
              <LightIconButton
                aria-label="Unavailable record button"
                disabled
                onClick={handleClick}
              >
                <IconPlus />
              </LightIconButton>
            </span>
          </ButtonGroup>
        }
      >
        Record
      </ListItem>
      <ListItem
        startIcon={<IconGripVertical />}
        actionsVisibility="always"
        actions={
          <LightIconButton
            aria-label="Add to draggable record"
            onClick={handleClick}
          >
            <IconPlus />
          </LightIconButton>
        }
      >
        Draggable record
      </ListItem>
      <Button variant="link" onClick={handleClick}>
        Log out
      </Button>
      <output aria-label="Activations">{activations}</output>
    </ThemeProvider>
  );
};

export default defineFrontComponent({
  universalIdentifier: '42d01c10-861e-4596-9178-d219f2800764',
  name: 'kovaa-lab-ui-button-controls',
  description: 'Button rendering and interactions in the sandbox',
  component: ButtonControls,
});
