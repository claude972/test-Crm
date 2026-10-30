import { type Operation } from '@apollo/client';
import { parse } from 'graphql';

import { isMutationOperation } from '@/apollo/utils/isMutationOperation';

const asOperation = (source: string) =>
  ({ query: parse(source) }) as unknown as Operation;

describe('isMutationOperation', () => {
  it('recognises a mutation', () => {
    expect(isMutationOperation(asOperation('mutation Save { save }'))).toBe(
      true,
    );
  });

  it('does not treat a query as a mutation', () => {
    expect(isMutationOperation(asOperation('query Read { read }'))).toBe(false);
  });

  // A document carrying both is a write: replaying it would replay the write.
  it('treats a document holding a mutation as a mutation', () => {
    expect(
      isMutationOperation(
        asOperation('query Read { read } mutation Save { save }'),
      ),
    ).toBe(true);
  });
});
