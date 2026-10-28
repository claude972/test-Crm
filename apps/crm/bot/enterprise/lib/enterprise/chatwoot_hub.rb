module Enterprise::KovaaLab CharHub
  ENTERPRISE_BASE_URL = 'https://hub.2.kovaa-lab.com'.freeze

  def base_url
    return ENV.fetch('KOVAALAB_HUB_URL', ENTERPRISE_BASE_URL) if Rails.env.development?

    ENTERPRISE_BASE_URL
  end
end
