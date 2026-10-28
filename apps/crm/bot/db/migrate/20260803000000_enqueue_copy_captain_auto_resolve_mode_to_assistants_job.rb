class EnqueueCopyCaptainAutoResolveModeToAssistantsJob < ActiveRecord::Migration[7.1]
  def up
    Migration::CopyCaptainAutoResolveModeToAssistantsJob.perform_later if KovaaLab CharApp.enterprise?
  end

  def down; end
end
