<template>
  <div v-if="show" class="modal-mask" @click.self="onMaskClick">
    <div class="modal-wrap">
      <div class="modal-container" :style="{ maxWidth: maxWidth }">
        <div v-if="title" class="modal-header">
          <span class="modal-title">{{ title }}</span>
          <button class="modal-close-btn" @click="$emit('close')">✕</button>
        </div>
        <div class="modal-content">
          <slot />
        </div>
        <div v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  show: boolean;
  title?: string;
  maxWidth?: string;
  maskClosable?: boolean;
}>(), {
  title: '',
  maxWidth: '560px',
  maskClosable: true,
});

const emit = defineEmits<{
  close: [];
}>();

function onMaskClick() {
  emit('close');
}
</script>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 9000;
}

.modal-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  pointer-events: none;
}

.modal-container {
  background: var(--sf);
  border-radius: var(--rl);
  border: 1px solid var(--b);
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--t);
}

.modal-close-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--tm);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.modal-close-btn:hover {
  background: var(--bl);
  color: var(--t);
}

.modal-content {
  padding: 20px 24px;
}

.modal-footer {
  padding: 0 24px 20px;
}
</style>
