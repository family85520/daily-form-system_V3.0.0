<template>
  <header class="app-header">
    <div class="header-top">
      <div>
        <h1 class="header-title">每日数据填报</h1>
        <div class="header-date">{{ formattedDate }}</div>
      </div>
      <span :class="['conn-status', connClass]">{{ connText }}</span>
    </div>
    <div class="header-selector">
      <slot name="selector" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDataStore } from '@/stores/useDataStore';

const dataStore = useDataStore();

const formattedDate = computed(() => {
  const d = new Date();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 星期${weekDays[d.getDay()]}`;
});

const connClass = computed(() => {
  switch (dataStore.connectionStatus) {
    case 'ok': return 'conn-ok';
    case 'err': return 'conn-err';
    default: return 'conn-loading';
  }
});

const connText = computed(() => {
  switch (dataStore.connectionStatus) {
    case 'ok': return '● 已连接';
    case 'err': return '● 离线';
    default: return '连接中...';
  }
});
</script>

<style scoped>
.app-header {
  background: var(--p);
  color: #fff;
  padding: 14px 20px 12px;
  position: sticky;
  top: 0;
  z-index: 900;
  overflow: visible;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.header-date {
  font-size: 11px;
  opacity: 0.75;
  margin-top: 1px;
}

.header-selector {
  margin-top: 8px;
  position: relative;
  z-index: 9999;
}

.conn-status {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 12px;
  margin-left: auto;
  font-weight: 500;
}

.conn-ok { background: var(--okl); color: var(--ok); }
.conn-err { background: var(--dl); color: var(--d); }
.conn-loading { background: var(--wl); color: var(--w); }
</style>
