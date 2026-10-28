require 'rails_helper'

RSpec.describe Internal::CheckNewVersionsJob do
  subject(:job) { described_class.perform_now }

  it 'updates the latest kovaa-lab version in redis' do
    data = { 'version' => '1.2.3' }
    allow(Rails.env).to receive(:production?).and_return(true)
    allow(KovaaLab CharHub).to receive(:sync_with_hub).and_return(data)
    job
    expect(KovaaLab CharHub).to have_received(:sync_with_hub)
    expect(Redis::Alfred.get(Redis::Alfred::LATEST_KOVAALAB_VERSION)).to eq data['version']
  end
end
