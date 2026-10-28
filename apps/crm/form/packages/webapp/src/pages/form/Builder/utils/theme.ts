import { getTheme, getThemeStyle } from '@kovaa-lab/form-renderer'
import { FormTheme } from '@kovaa-lab/shared-types-enums'

export function insertThemeStyle(customTheme?: FormTheme) {
  const theme = getTheme(customTheme)
  let content = getThemeStyle(theme)

  let style = document.getElementById('kovaa-lab-theme')

  if (!style) {
    style = document.createElement('style')
    style.id = 'kovaa-lab-theme'

    document.head.appendChild(style)
  }

  if (customTheme?.customCSS) {
    content += customTheme!.customCSS
  }

  style.textContent = content
}
