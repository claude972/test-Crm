import { doNotTranslate } from 'kovaa-lab-shared/i18n';

export const getForeignKeyNameFromRelationFieldName = (nameSingular: string) =>
  doNotTranslate(`${nameSingular}Id`);
