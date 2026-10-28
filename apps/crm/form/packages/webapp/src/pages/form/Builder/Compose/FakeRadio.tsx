import type { FC } from 'react'

interface FakeRadioProps extends ComponentProps {
  hotkey?: string
  label: string | number
}

export const FakeRadio: FC<FakeRadioProps> = ({ hotkey, label, ...restProps }) => {
  return (
    <div className="kovaa-lab-radio" {...restProps}>
      <div className="kovaa-lab-radio-container">
        <div className="kovaa-lab-radio-content">
          {hotkey && <div className="kovaa-lab-radio-hotkey">{hotkey}</div>}
          <div className="kovaa-lab-radio-label">{label}</div>
        </div>
      </div>
    </div>
  )
}
