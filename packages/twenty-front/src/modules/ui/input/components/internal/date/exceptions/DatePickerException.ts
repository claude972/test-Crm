import { doNotTranslate } from 'kovaa-lab-shared/i18n';

export class DatePickerException extends RangeError {
  constructor({ message }: { message: string }) {
    super(message);
    this.name = doNotTranslate('DatePickerException');
  }
}
