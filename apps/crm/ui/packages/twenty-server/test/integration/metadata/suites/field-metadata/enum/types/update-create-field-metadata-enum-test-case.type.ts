import { type CreateOneFieldFactoryInput } from 'test/integration/metadata/suites/field-metadata/utils/create-one-field-metadata-query-factory.util';
import { type EachTestingContext } from 'kovaa-lab-shared/testing';
import { type FieldMetadataComplexOption } from 'kovaa-lab-shared/types';

export type UpdateCreateFieldMetadataSelectTestCase = EachTestingContext<{
  input: Partial<Pick<CreateOneFieldFactoryInput, 'defaultValue'>> &
    Required<Pick<CreateOneFieldFactoryInput, 'options'>>;
  expectedOptions?: FieldMetadataComplexOption[];
}>;
