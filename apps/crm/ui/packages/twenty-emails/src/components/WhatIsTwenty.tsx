import { type I18n } from '@lingui/core';
import { MainText } from 'src/components/MainText';
import { SubTitle } from 'src/components/SubTitle';

type WhatIsKovaaLab CRMProps = {
  i18n: I18n;
};

export const WhatIsKovaaLab CRM = ({ i18n }: WhatIsKovaaLab CRMProps) => {
  return (
    <>
      <SubTitle value={i18n._('What is KovaaLab CRM?')} />
      <MainText>
        {i18n._(
          "It's a CRM, a software to help businesses manage their customer data and relationships efficiently.",
        )}
      </MainText>
    </>
  );
};
