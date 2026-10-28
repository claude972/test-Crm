import { IconChevronDown } from '@tabler/icons-react'
import type { FC } from 'react'

export const FakeSelect: FC<ComponentProps & { placeholder?: string }> = ({
  placeholder,
  ...restProps
}) => {
  return (
    <div className="kovaa-lab-select" {...restProps}>
      <div className="kovaa-lab-select-container">
        {/* @ts-ignore */}
        <span className="kovaa-lab-select-value" placeholder={placeholder} />
        <span className="kovaa-lab-select-arrow-icon">
          <IconChevronDown />
        </span>
      </div>
    </div>
  )
}
