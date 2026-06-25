<template>
  <div class="auth-page">
    <n-card class="auth-card" :bordered="false">
      <div class="auth-icon">🔒</div>
      <h2 class="auth-title">{{ title }}</h2>
      <p v-if="subtitle" class="auth-subtitle">{{ subtitle }}</p>
      <n-input
        v-model:value="password"
        type="password"
        show-password-on="click"
        placeholder="请输入管理员密码"
        :status="error ? 'error' : undefined"
        @keyup.enter="handleVerify"
      />
      <p v-if="error" class="auth-error">{{ error }}</p>
      <n-button type="primary" block :loading="loading" @click="handleVerify">
        验证身份
      </n-button>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NButton, NCard, NInput } from 'naive-ui';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToast } from '@/composables/useToast';

withDefaults(defineProps<{
  title?: string;
  subtitle?: string;
}>(), {
  title: '需要验证身份',
  subtitle: '此页面需要管理员权限，请输入密码继续',
});

const emit = defineEmits<{
  verified: [];
}>();

const authStore = useAuthStore();
const { toastError } = useToast();
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleVerify() {
  if (!password.value.trim()) {
    error.value = '请输入密码';
    return;
  }
  error.value = '';
  loading.value = true;
  try {
    const ok = await authStore.verify(password.value);
    if (ok) {
      emit('verified');
    } else {
      error.value = '密码错误，请重试';
    }
  } catch {
    error.value = '验证失败，请稍后重试';
    toastError('网络错误');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 20px;
}

.auth-card {
  width: 100%;
  max-width: 380px;
  text-align: center;
}

.auth-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.auth-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--n-text-color-1);
  margin: 0 0 8px;
}

.auth-subtitle {
  font-size: 13px;
  color: var(--n-text-color-3);
  margin: 0 0 20px;
}

.auth-error {
  font-size: 12px;
  color: var(--n-error-color);
  margin: 8px 0 0;
  text-align: left;
}
</style>
