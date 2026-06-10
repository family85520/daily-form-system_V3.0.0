<template>
  <Transition name="loading-fade">
    <div v-if="isVisible" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">{{ loadingText }}</div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useLoading } from '@/composables/useLoading';

const { isVisible, loadingText } = useLoading();
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(240, 244, 248, 0.95);
  z-index: var(--z-loading);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--b);
  border-top-color: var(--p);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.loading-text {
  font-size: 14px;
  color: var(--ts);
  font-weight: 500;
}

.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.2s ease;
}

.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}
</style>
