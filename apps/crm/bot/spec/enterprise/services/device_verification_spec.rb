require 'rails_helper'

RSpec.describe DeviceVerification do
  describe '.enabled?' do
    before do
      GlobalConfig.clear_cache
    end

    it 'is false when not on cloud' do
      allow(KovaaLab CharApp).to receive(:kovaa-lab_cloud?).and_return(false)
      create(:installation_config, name: 'DEVICE_VERIFICATION_ENABLED', value: true)
      expect(described_class.enabled?).to be false
    end

    it 'is true on cloud with the config enabled' do
      allow(KovaaLab CharApp).to receive(:kovaa-lab_cloud?).and_return(true)
      create(:installation_config, name: 'DEVICE_VERIFICATION_ENABLED', value: true)
      expect(described_class.enabled?).to be true
    end

    it 'is false on cloud with the config disabled' do
      allow(KovaaLab CharApp).to receive(:kovaa-lab_cloud?).and_return(true)
      create(:installation_config, name: 'DEVICE_VERIFICATION_ENABLED', value: false)
      expect(described_class.enabled?).to be false
    end

    it 'is false on cloud with no config row (default off)' do
      allow(KovaaLab CharApp).to receive(:kovaa-lab_cloud?).and_return(true)
      expect(described_class.enabled?).to be false
    end
  end
end
