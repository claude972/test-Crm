import { type UpdateCreateFieldMetadataSelectTestCase } from 'test/integration/metadata/suites/field-metadata/enum/types/update-create-field-metadata-enum-test-case.type';
import { type SuccessfulAndFailingTestCases } from 'kovaa-lab-shared/testing';

export type FieldMetadataEnumSuccessfulAndFailingTestCases =
  SuccessfulAndFailingTestCases<
    UpdateCreateFieldMetadataSelectTestCase['context']
  >;
