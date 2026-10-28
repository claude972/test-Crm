import { type PerformKovaaLab CRMConfigQueryParams } from 'test/integration/kovaa-lab-config/types/perform-kovaa-lab-config-query.type';

import {
  type DeleteConfigVariableFactoryInput,
  deleteConfigVariableQueryFactory,
} from './delete-config-variable.query-factory.util';
import { makeAdminPanelApiRequest } from './make-admin-panel-api-request.util';

export const deleteConfigVariable = async ({
  input,
  expectToFail = false,
}: PerformKovaaLab CRMConfigQueryParams<DeleteConfigVariableFactoryInput>) => {
  const graphqlOperation = deleteConfigVariableQueryFactory({
    key: input.key,
  });

  const response = await makeAdminPanelApiRequest(graphqlOperation);

  if (!expectToFail) {
    expect(response.body.data).toBeDefined();
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.deleteDatabaseConfigVariable).toBeDefined();
  } else {
    expect(response.body.errors).toBeDefined();
  }

  return { data: response.body.data, errors: response.body.errors };
};
