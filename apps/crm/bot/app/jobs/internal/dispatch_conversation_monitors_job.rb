class Internal::DispatchConversationMonitorsJob < ApplicationJob
  queue_as :scheduled_jobs

  def perform
    ConversationMonitors::DispatchJob.perform_later if KovaaLab CharApp.enterprise?
  end
end
