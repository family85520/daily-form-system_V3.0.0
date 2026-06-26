<template>
  <header class="app-header">
    <div class="header-inner">
      <div class="header-brand">
        <div class="brand-icon">
          <i class="fas fa-leaf"></i>
        </div>
        <div class="brand-text">
          <h1 class="header-title">日填报系统</h1>
          <p class="header-sub">工作数据日常上报管理</p>
        </div>
      </div>
      <div class="header-right">
        <slot name="selector" />
        <span :class="['conn-badge', connClass]">
          <span class="conn-dot"></span>
          {{ connText }}
        </span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDataStore } from '@/stores/useDataStore';

const dataStore = useDataStore();

const connClass = computed(() => {
  switch (dataStore.connectionStatus) {
    case 'ok': return 'conn-ok';
    case 'err': return 'conn-err';
    default: return 'conn-loading';
  }
});

const connText = computed(() => {
  switch (dataStore.connectionStatus) {
    case 'ok': return '已连接';
    case 'err': return '离线';
    default: return '连接中...';
  }
});
</script>

<style scoped>
.app-header {
  position: fixed;
  top: 0;
  left: var(--sidebar-width);
  right: 0;
  z-index: calc(var(--z-header) + 1);
  height: var(--header-height);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-bottom: none;
  box-shadow: 0 1px 0 rgba(0, 77, 64, 0.04);
}

@media (max-width: 767px) {
  .app-header {
    left: 0;
  }
}

.header-inner {
  max-width: var(--max-width);
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

@media (max-width: 767px) {
  .header-inner {
    padding: 0 12px;
  }

  .brand-text {
    display: none;
  }

  .header-sub {
    display: none;
  }
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: var(--text-base);
  transition: transform 0.2s;
}

.brand-icon:hover {
  transform: rotate(15deg) scale(1.05);
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.header-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--t);
  font-family: var(--font-display);
}

.header-sub {
  font-size: var(--text-xs);
  color: var(--tm);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.conn-badge {
  font-size: var(--text-xs);
  padding: 4px 12px;
  border-radius: var(--r-pill);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
}

.conn-badge:hover {
  opacity: 0.8;
}

.conn-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.conn-ok { background: var(--okl); color: var(--ok); }
.conn-ok .conn-dot { background: var(--ok); }
.conn-err { background: var(--dl); color: var(--d); }
.conn-err .conn-dot { background: var(--d); }
.conn-loading { background: var(--wl); color: var(--w); }
.conn-loading .conn-dot { background: var(--w); animation: spin 1s linear infinite; }
</style>
