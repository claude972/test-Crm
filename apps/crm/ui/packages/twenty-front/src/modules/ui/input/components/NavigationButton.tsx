import { type ComponentType } from 'react';
import { type LinkProps } from 'react-router-dom';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Button, type ButtonProps } from 'kovaa-lab-ui/primitives/input';

import { NavigationLink } from '@/ui/input/components/NavigationLink';

type NavigationButtonProps = Omit<ButtonProps, 'href' | 'render'> & {
  buttonComponent?: ComponentType<ButtonProps>;
  to?: LinkProps['to'];
};

export const NavigationButton = ({
  buttonComponent: ButtonComponent = Button,
  to,
  ...props
}: NavigationButtonProps) => {
  if (isDefined(to)) {
    return (
      <NavigationLink to={to}>
        {({ href, render }) => (
          <ButtonComponent
            nativeButton={false}
            role="link"
            {...props}
            href={href}
            render={render}
          />
        )}
      </NavigationLink>
    );
  }

  return <ButtonComponent {...props} />;
};
