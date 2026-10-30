import { gql } from '@apollo/client';

export const HERMES_STRUCTURE_DASHBOARD = gql`
  query HermesDashboard($input: HermesStructureDashboardInput) {
    hermesStructureDashboard(input: $input) {
      generatedAt
      periodStart
      periodEnd
      partial
      structures {
        structure {
          workspaceId
          displayName
          isCurrent
          requiresAuthentication
          workspaceUrls {
            subdomainUrl
            customUrl
          }
        }
        metrics {
          key
          value
          status
        }
      }
      totals {
        key
        value
        status
        contributingStructures
        totalStructures
      }
    }
  }
`;
