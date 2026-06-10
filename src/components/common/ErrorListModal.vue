<template>
  <BaseModal
    :show="show"
    title="⚠️ 数据校验失败"
    max-width="560px"
    @close="$emit('close')"
  >
    <div class="error-count">
      共 <strong>{{ errors.length }}</strong> 处错误，请修正后重新提交
    </div>

    <div class="error-list">
      <div
        v-for="(err, i) in errors"
        :key="i"
        class="error-item"
      >
        <span class="error-icon">⚠️</span>
        <span class="error-text">{{ err }}</span>
      </div>
    </div>

    <template #footer>
      <button class="btn btn-primary btn-block" @click="$emit('close')">关闭</button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from './BaseModal.vue';

defineProps<{
  show: boolean;
  errors: string[];
}>();

defineEmits<{
  close: [];
}>();
</script>

<style scoped>
.error-count {
  font-size: 13px;
  color: var(--ts);
  margin-bottom: 12px;
  padding: 10px;
  background: var(--dl);
  border: 1px solid var(--d);
  border-radius: var(--r);
  text-align: center;
}

.error-count strong {
  color: var(--d);
  font-size: 16px;
}

.error-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.error-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 6px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--r);
  font-size: 13px;
  color: var(--d);
}

.error-icon {
  flex-shrink: 0;
  font-size: 14px;
  margin-top: 1px;
}

.error-text {
  flex: 1;
  line-height: 1.4;
}
</style>
