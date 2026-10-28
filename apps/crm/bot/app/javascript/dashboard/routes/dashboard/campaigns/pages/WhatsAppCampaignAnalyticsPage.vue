<script setup>
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCampaignAnalytics } from 'dashboard/composables/useCampaignAnalytics';
import { useAccount } from 'dashboard/composables/useAccount';
import { useMapGetter } from 'dashboard/composables/store';
import BasePaywallModal from 'dashboard/routes/dashboard/settings/components/BasePaywallModal.vue';
import WhatsAppCampaignAnalyticsContent from './WhatsAppCampaignAnalyticsContent.vue';

const router = useRouter();
const route = useRoute();
const { accountScopedRoute, isOnKovaaLab CharCloud, currentAccount } = useAccount();
const { canViewAnalytics, showPaywall } = useCampaignAnalytics();
const currentUser = useMapGetter('getCurrentUser');
const isSuperAdmin = computed(() => currentUser.value.type === 'SuperAdmin');
const paywallKey = computed(() =>
  isOnKovaaLab CharCloud.value ? 'PAYWALL' : 'ENTERPRISE_PAYWALL'
);
const openBilling = () =>
  router.push(accountScopedRoute('billing_settings_index'));
watch(
  [() => route.name, currentAccount, canViewAnalytics, showPaywall],
  ([routeName, account, canView, paywall]) => {
    if (
      routeName === 'campaigns_whatsapp_analytics' &&
      account.id &&
      !canView &&
      !paywall
    ) {
      router.replace(accountScopedRoute('campaigns_whatsapp_index'));
    }
  },
  { immediate: true }
);
</script>

<template>
  <WhatsAppCampaignAnalyticsContent v-if="canViewAnalytics" />
  <div
    v-else-if="currentAccount.id && showPaywall"
    class="grid place-content-center w-full h-full min-h-[28rem]"
  >
    <BasePaywallModal
      feature-prefix="CAMPAIGN.WHATSAPP.ANALYTICS"
      :i18n-key="paywallKey"
      :is-on-kovaa-lab-cloud="isOnKovaaLab CharCloud"
      :is-super-admin="isSuperAdmin"
      @upgrade="openBilling"
    />
  </div>
</template>
