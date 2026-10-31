import { gql } from '@apollo/client';

// Written by hand because codegen never produced one: no frontend operation for
// `createEmailingDomain` has ever existed, so there is no generated document to
// reuse. The selection set is the shape `getEmailingDomains` already publishes,
// so the answer reads with the same fields the centre displays.
export const HERMES_CREATE_EMAILING_DOMAIN = gql`
  mutation HermesCreateEmailingDomain($input: CreateEmailingDomainInput!) {
    createEmailingDomain(input: $input) {
      id
      domain
      status
      unsubscribeHostnameStatus
      verifiedAt
      verificationRecords {
        type
        key
        value
        priority
        status
      }
      createdAt
      updatedAt
    }
  }
`;
