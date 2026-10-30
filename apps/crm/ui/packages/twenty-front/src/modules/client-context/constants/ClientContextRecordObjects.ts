import { CoreObjectNameSingular } from 'kovaa-lab-shared/types';

// The records a client context belongs on. A form response and an appointment
// are about a person or the company they belong to; mounting this surface on
// every record page would promise context for objects no source ever refers
// to.
export const CLIENT_CONTEXT_RECORD_OBJECT_NAMES: readonly string[] = [
  CoreObjectNameSingular.Person,
  CoreObjectNameSingular.Company,
];

export const isClientContextRecordObject = (
  objectNameSingular: string | undefined,
): boolean =>
  objectNameSingular !== undefined &&
  CLIENT_CONTEXT_RECORD_OBJECT_NAMES.includes(objectNameSingular);
