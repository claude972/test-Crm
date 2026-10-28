import { gql } from 'graphql-tag';
import { type ConfigVariableValue } from 'kovaa-lab-shared/types';

export type UpdateConfigVariableFactoryInput = {
  key: string;
  value: ConfigVariableValue;
};

export const updateConfigVariableQueryFactory = ({
  key,
  value,
}: UpdateConfigVariableFactoryInput) => {
  return {
    query: gql`
      mutation UpdateDatabaseConfigVariable($key: String!, $value: JSON!) {
        updateDatabaseConfigVariable(key: $key, value: $value)
      }
    `,
    variables: {
      key,
      value,
    },
  };
};
