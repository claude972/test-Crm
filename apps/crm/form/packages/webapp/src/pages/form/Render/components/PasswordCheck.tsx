import { useTranslation } from '@kovaa-lab/form-renderer/src'
import { FormModel } from '@kovaa-lab/shared-types-enums'
import clsx from 'clsx'
import Form, { Field } from 'rc-field-form'
import { useState } from 'react'

import { EndpointService } from '../service/endpoint'

import { Input } from './Input'
import { Loader } from './Loader'

interface PasswordCheckProps {
  form: FormModel
  onFinish: (passwordToken: string) => void
}

export const PasswordCheck = ({ form, onFinish }: PasswordCheckProps) => {
  const { t } = useTranslation()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  async function handleFinish(values: Record<string, Any>): Promise<void> {
    if (loading) {
      return
    }

    setLoading(true)
    setError(undefined)

    try {
      const passwordToken = await EndpointService.verifyFormPassword(form.id, values.password)
      onFinish(passwordToken)
    } catch (err: any) {
      setError(err.response?.errors[0].message || err.message)
    }

    setLoading(false)
  }

  return (
    <div className="kovaa-lab-root">
      <div className="kovaa-lab-block-container kovaa-lab-short-text">
        <div className="kovaa-lab-theme-background"></div>
        <div className="kovaa-lab-block kovaa-lab-block-next kovaa-lab-block-entered">
          <div className="scrollbar h-full w-full overflow-x-hidden px-6 md:px-20">
            <div className="kovaa-lab-scroll-container">
              <div className="kovaa-lab-block-main">
                <div className="mb-20 mt-12 md:mb-36 md:mt-20">
                  <div className="mb-10">
                    <h1 className="kovaa-lab-block-title">Password required</h1>
                  </div>
                  <Form onFinish={handleFinish}>
                    <Field
                      name="password"
                      rules={[{ required: true, message: 'This field is required' }]}
                    >
                      <Input />
                    </Field>
                    {error && (
                      <div className="kovaa-lab-validation-wrapper">
                        <div className="kovaa-lab-validation-error">{error}</div>
                      </div>
                    )}
                    <Field>
                      <div className="kovaa-lab-submit-container">
                        <button
                          className="kovaa-lab-submit-button relative"
                          type="submit"
                          disabled={loading}
                        >
                          {loading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Loader />
                            </div>
                          )}
                          <span
                            className={clsx({
                              'opacity-0': loading
                            })}
                          >
                            {t('Next')}
                          </span>
                        </button>
                      </div>
                    </Field>
                  </Form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
