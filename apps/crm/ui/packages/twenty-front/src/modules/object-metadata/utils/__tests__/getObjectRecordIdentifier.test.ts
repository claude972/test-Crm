import { getObjectRecordIdentifier } from '@/object-metadata/utils/getObjectRecordIdentifier';
import { FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED } from 'kovaa-lab-shared/constants';
import { getMockObjectMetadataItemOrThrow } from '~/testing/utils/getMockObjectMetadataItemOrThrow';

const companyObjectMetadataItem = getMockObjectMetadataItemOrThrow('company');

describe('getObjectRecordIdentifier', () => {
  it('should expose the label identifier value as the name', () => {
    const identifier = getObjectRecordIdentifier({
      objectMetadataItem: companyObjectMetadataItem,
      record: { __typename: 'Company', id: 'company-id', name: 'Acme' },
      allowRequestsToKovaaLabCRMIcons: false,
    });

    expect(identifier.name).toBe('Acme');
  });

  it('should name a restricted record as not shared', () => {
    const identifier = getObjectRecordIdentifier({
      objectMetadataItem: companyObjectMetadataItem,
      record: {
        __typename: 'Company',
        id: 'company-id',
        name: FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED,
      },
      allowRequestsToKovaaLabCRMIcons: false,
    });

    expect(identifier.name).toBe('Not shared');
  });
});
