import { type CommandMenuItemProps } from '@/command-menu/types/CommandMenuItemProps';
import { ListItemIconContainer } from '@/ui/navigation/list-item/components/ListItemIconContainer';
import { isDefined } from 'kovaa-lab-shared/utils';

type GetCommandMenuItemStartIconOptions = Pick<
  CommandMenuItemProps,
  'Icon' | 'LeftComponent'
> & {
  iconSize: number;
  iconStroke: number;
};

export const getCommandMenuItemStartIcon = ({
  LeftComponent,
  Icon,
  iconSize,
  iconStroke,
}: GetCommandMenuItemStartIconOptions) => {
  if (isDefined(LeftComponent)) {
    return LeftComponent;
  }

  if (!isDefined(Icon)) {
    return undefined;
  }

  return (
    <ListItemIconContainer>
      <Icon size={iconSize} stroke={iconStroke} />
    </ListItemIconContainer>
  );
};
