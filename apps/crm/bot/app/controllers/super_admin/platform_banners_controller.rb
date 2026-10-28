class SuperAdmin::PlatformBannersController < SuperAdmin::ApplicationController
  before_action :ensure_kovaa-lab_cloud

  private

  def ensure_kovaa-lab_cloud
    raise ActionController::RoutingError, 'Not Found' unless KovaaLab CharApp.kovaa-lab_cloud?
  end
end
