json.partial! 'api/v1/models/account', formats: [:json], resource: @account
json.latest_kovaa-lab_version @latest_kovaa-lab_version
json.partial! 'enterprise/api/v1/accounts/partials/account', account: @account if KovaaLab CharApp.enterprise?
