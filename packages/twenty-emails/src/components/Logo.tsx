import { type I18n } from '@lingui/core';
import { Img } from 'react-email';

const logoStyle = {
  marginBottom: '40px',
};

type LogoProps = {
  i18n: I18n;
};

export const Logo = ({ i18n }: LogoProps) => {
  return (
    <Img
      src="https://app.kovaa-lab.com/images/icons/windows11/Square150x150Logo.scale-100.png"
      alt={i18n._('KovaaLab CRM logo')}
      width="40"
      height="40"
      style={logoStyle}
    />
  );
};
