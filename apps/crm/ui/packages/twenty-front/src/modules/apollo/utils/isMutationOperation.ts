import { type Operation } from '@apollo/client';
import { Kind, OperationTypeNode } from 'graphql';

// A mutation is never safe to replay on its own: the first attempt may have
// already written, and after a workspace switch the replay would land in the
// new one. Queries carry no such risk.
export const isMutationOperation = (operation: Operation): boolean =>
  operation.query.definitions.some(
    (definition) =>
      definition.kind === Kind.OPERATION_DEFINITION &&
      definition.operation === OperationTypeNode.MUTATION,
  );
