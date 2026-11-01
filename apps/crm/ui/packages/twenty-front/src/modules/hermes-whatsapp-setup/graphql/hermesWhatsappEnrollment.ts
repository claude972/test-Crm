import { gql } from '@apollo/client';

export const HERMES_WHATSAPP_ENROLLMENT_START = gql`
  mutation HermesWhatsappEnrollmentStart(
    $input: HermesWhatsappEnrollmentScopeInput!
  ) {
    hermesWhatsappEnrollmentStart(input: $input)
  }
`;
export const HERMES_WHATSAPP_ENROLLMENT_QR = gql`
  mutation HermesWhatsappEnrollmentQr(
    $input: HermesWhatsappEnrollmentQrInput!
  ) {
    hermesWhatsappEnrollmentQr(input: $input)
  }
`;
export const HERMES_WHATSAPP_ENROLLMENT_STATUS = gql`
  mutation HermesWhatsappEnrollmentStatus(
    $input: HermesWhatsappEnrollmentScopeInput!
  ) {
    hermesWhatsappEnrollmentStatus(input: $input)
  }
`;
export const HERMES_WHATSAPP_ENROLLMENT_ACTIVATE = gql`
  mutation HermesWhatsappEnrollmentActivate(
    $input: HermesWhatsappEnrollmentScopeInput!
  ) {
    hermesWhatsappEnrollmentActivate(input: $input)
  }
`;
