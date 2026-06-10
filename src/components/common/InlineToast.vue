<template>
  <Transition name="toast-pop">
    <div v-if="show" class="inline-toast-mask" @click.self="$emit('close')">
      <div class="inline-toast">
        <span class="inline-toast-text">{{ message }}</span>
        <span class="inline-toast-hint">点击任意处关闭</span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean;
  message: string;
}>();

defineEmits<{
  close: [];
}>();
</script>

<style scoped>
.inline-toast-mask {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.inline-toast {
  background: rgba(30, 41, 59, 0.92);
  color: #fff;
  padding: 16px 28px;
  border-radius: var(--r);
  font-size: 14px;
  text-align: center;
  max-width: 85%;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.inline-toast-text {
  font-weight: 500;
  line-height: 1.5;
}

.inline-toast-hint {
  font-size: 11px;
  opacity: 0.5;
  margin-top: 2px;
}

.toast-pop-enter-active {
  transition: all 0.2s ease;
}

.toast-pop-leave-active {
  transition: all 0.15s ease;
}

.toast-pop-enter-from,
.toast-pop-leave-to {
  opacity: 0;
}

.toast-pop-enter-from .inline-toast,
.toast-pop-leave-to .inline-toast {
  transform: scale(0.85);
}
</style>
