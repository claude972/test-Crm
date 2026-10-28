import { isObject } from '@sniptt/guards';
import { RELATION_NESTED_QUERY_KEYWORDS } from 'kovaa-lab-shared/constants';
import { isDefined } from 'kovaa-lab-shared/utils';

const { CONNECT, CREATE, DISCONNECT } = RELATION_NESTED_QUERY_KEYWORDS;

export const isRelationNestedOperation = (value: unknown): boolean => {
  if (!isObject(value)) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    (CONNECT in obj && isDefined(obj[CONNECT])) ||
    (CREATE in obj && isDefined(obj[CREATE])) ||
    (DISCONNECT in obj && isDefined(obj[DISCONNECT]))
  );
};
