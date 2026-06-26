<template>
  <div
    class="nav-item"
    :class="{ 'nav-item-active': active, 'nav-item-inactive': !active }"
    @click="handleClick"
  >
    <i :class="icon" class="nav-icon"></i>
    <span>{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const props = defineProps<{
  to: string;
  icon: string;
  label: string;
  active: boolean;
}>();

const router = useRouter();

const handleClick = () => {
  if (props.to) {
    router.push(props.to);
  }
};
</script>

<style scoped>
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--r);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: var(--text-base);
  font-weight: 500;
  position: relative;
}

.nav-icon {
  width: 20px;
  text-align: center;
  font-size: var(--text-lg);
  flex-shrink: 0;
}

.nav-item-active {
  background: var(--gradient);
  color: #fff;
  box-shadow: var(--shadow-sm);
}

.nav-item-active .nav-icon {
  color: rgba(255, 255, 255, 0.9);
}

.nav-item-inactive {
  color: var(--t);
}

.nav-item-inactive:hover {
  background: var(--card-bg);
  color: var(--p);
  transform: translateX(2px);
}

.nav-item-inactive:active {
  transform: scale(0.98);
}
</style>
