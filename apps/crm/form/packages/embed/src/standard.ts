import { Dom, buildUrl, isMobile } from './utils'

import IconLoading from './assets/icon-loading.svg'
import { EmbedConfig, StandardSettings } from './type'

const STANDARD_TEMPLATE = `
<div class="kovaa-lab__iframe-container">
  <iframe src="{src}" allow="microphone; camera"></iframe>
  <div class="kovaa-lab__loading-container">${IconLoading}</div>
</div>
`

export class Standard<T extends StandardSettings> {
  protected readonly formId: string
  protected readonly containerId: string
  protected readonly $container: Dom
  protected readonly settings: EmbedConfig<T>['settings']
  protected readonly formUrl: string

  constructor(config: EmbedConfig<T>) {
    const { formId, type, container, settings, hiddenFields } = config

    this.formUrl = buildUrl(settings.customUrl.replace(/\/+$/, `/${formId}?`), {
      ...settings,
      ...hiddenFields
    })

    container.addClass('kovaa-lab__embed')
    container.addClass(`kovaa-lab__embed-${type}`)

    this.formId = formId
    this.containerId = `kovaa-lab__${type}-${formId}`
    this.$container = container
    this.settings = settings

    this.render()
  }

  protected render() {
    this.$container.style('width', `${this.settings.width}${this.settings.widthType}`)

    setTimeout(() => {
      let height = `${this.settings.height}${this.settings.heightType}`

      if (this.settings.autoResizeHeight) {
        const rect = this.$container.rect()

        height =
          (isMobile ? window.innerHeight : Math.min(window.innerHeight, rect.width * 0.6)) + 'px'
      }

      this.$container.style('height', height)
    }, 0)

    this.$container.append(
      Dom.compile(STANDARD_TEMPLATE, {
        src: this.formUrl
      })
    )

    this.$container.find('iframe').get(0).onload = () => {
      this.$container.find('.kovaa-lab__loading-container').remove()
    }
  }
}
