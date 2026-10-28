import type { FC } from 'react'

import type { BlockProps } from './Block'
import { Block } from './Block'

export const ThankYou: FC<BlockProps> = ({ field, locale, ...restProps }) => {
  return (
    <Block
      className="kovaa-lab-thank-you kovaa-lab-empty-state"
      field={field}
      locale={locale}
      {...restProps}
    />
  )
}
