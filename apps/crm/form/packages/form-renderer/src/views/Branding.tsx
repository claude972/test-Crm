import { FC } from 'react'
import { Trans } from 'react-i18next'

import { useTranslation } from '../utils'

import { LogoIcon } from '../components'
import { useStore } from '../store'

export const Branding: FC = () => {
  const { state } = useStore()
  const { t } = useTranslation()

  if (state.settings?.removeBranding) {
    return null
  }

  return (
    <a className="kovaa-lab-branding" href="https://kovaa-lab.com/?ref=badge" target="_blank">
      <Trans
        t={t}
        i18nKey="Made with KovaaLab"
        components={{
          icon: <LogoIcon className="inline h-4 w-4" />,
          span: <span className="font-medium" />
        }}
      />
    </a>
  )
}

export const WelcomeBranding: FC = () => {
  return (
    <div className="kovaa-lab-footer kovaa-lab-welcome-footer">
      <div className="kovaa-lab-footer-wrapper">
        <div className="kovaa-lab-footer-left" />
        <div className="kovaa-lab-footer-right">
          <Branding />
        </div>
      </div>
    </div>
  )
}
