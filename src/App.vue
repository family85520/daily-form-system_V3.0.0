<template>
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN">
    <n-notification-provider>
      <AppLayout>
        <template #header-selector>
          <TemplateSelector v-if="!isAdminPage && !isStatPage" />
        </template>
        <router-view />
      </AppLayout>
      <LoadingOverlay />
    </n-notification-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { zhCN, dateZhCN } from 'naive-ui';
import { NConfigProvider, NNotificationProvider } from 'naive-ui';
import AppLayout from '@/components/layout/AppLayout.vue';
import LoadingOverlay from '@/components/common/LoadingOverlay.vue';
import TemplateSelector from '@/components/template/TemplateSelector.vue';
import { useDataStore } from '@/stores/useDataStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLoading } from '@/composables/useLoading';
import { useToast } from '@/composables/useToast';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const dataStore = useDataStore();
const authStore = useAuthStore();
const { showLoading, hideLoading } = useLoading();
const { toastWarning } = useToast();
const route = useRoute();
const isAdminPage = computed(() => route.path.startsWith('/admin'));
const isStatPage = computed(() => route.path.startsWith('/stat'));

onMounted(async () => {
  try {
    showLoading('正在连接服务器...');
    await dataStore.loadData();
    await authStore.checkAuth();
  } catch (err) {
    console.error('初始化失败:', err);
    toastWarning('⚠️ 连接服务器失败，请检查网络');
  } finally {
    hideLoading();
  }
});
</script>

<style lang="scss">
@use './styles/global';
</style>
