import { FileUploadValue } from '@kovaa-lab/shared-types-enums'
import axios from 'axios'

export interface UploadContext {
  fieldId: string
  formId: string
  openToken: string
}

export class UploadService {
  static async upload(file: File, context?: UploadContext): Promise<FileUploadValue> {
    const formData = new FormData()
    formData.append('file', file)

    const result = await axios.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(context
          ? {
              'x-kovaa-lab-field-id': context.fieldId,
              'x-kovaa-lab-form-id': context.formId,
              'x-kovaa-lab-open-token': context.openToken
            }
          : {})
      }
    })

    return result.data
  }
}
