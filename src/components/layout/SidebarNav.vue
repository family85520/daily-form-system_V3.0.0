<template>
  <aside class="sidebar-nav">
    <div class="sidebar-brand">
      <div class="brand-icon">
        <i class="fas fa-leaf"></i>
      </div>
    </div>

    <div class="sidebar-section">
      <div class="section-label">功能导航</div>
      <nav-item
        to="/"
        icon="fas fa-home"
        label="工作台"
        :active="isActive('fill')"
      />
      <nav-item
        to="/history"
        icon="fas fa-clock"
        label="历史记录"
        :active="isActive('history')"
      />
      <nav-item
        to="/stat"
        icon="fas fa-chart-bar"
        label="数据统计"
        :active="isActive('stat')"
      />
      <nav-item
        to="/admin"
        icon="fas fa-cog"
        label="系统管理"
        :active="isActive('admin')"
      />
    </div>

    <div class="sidebar-footer">
      <div class="oxy-card footer-card">
        <div class="footer-title">填报进度</div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
          <span class="progress-text">{{ progressPercent }}%</span>
        </div>
        <div class="footer-hint">本月已填报 {{ progressDays }} 天</div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useDataStore } from '@/stores/useDataStore';
import NavItem from './NavItem.vue';

const route = useRoute();
const dataStore = useDataStore();

function isActive(name: string): boolean {
  return route.name === name || (name === 'fill' && route.path === '/');
}

// 简单计算填报进度
const progressPercent = computed(() => {
  const sub = dataStore.sub;
  const today = new Date().toISOString().split('T')[0];
  let filled = 0;
  let total = 0;

  Object.keys(sub).forEach(tplId => {
    const tplSub = sub[tplId] || {};
    const dateSub = tplSub[today] || {};
    Object.keys(dateSub).forEach(user => {
      const userSub = dateSub[user] || {};
      const rowCount = dataStore.tpls.find(t => t.id === tplId)?.rows?.length || 0;
      total += rowCount;
      filled += Object.keys(userSub).length;
    });
  });

  return total > 0 ? Math.min(Math.round((filled / total) * 100), 100) : 0;
});

const progressDays = computed(() => {
  const sub = dataStore.sub;
  const days = new Set<string>();
  Object.keys(sub).forEach(tplId => {
    Object.keys(sub[tplId] || {}).forEach(date => {
      const userSub = sub[tplId][date] || {};
      if (Object.keys(userSub).length > 0) days.add(date);
    });
  });
  return days.size;
});
</script>

<style scoped>
.sidebar-nav {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-right: 1px solid rgba(255, 255, 255, 0.5);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  z-index: 99;
}

@media (max-width: 767px) {
  .sidebar-nav {
    display: none;
  }
}

.sidebar-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 16px 16px;
}

.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--r);
  background: var(--gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: var(--text-lg);
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s;
}

.brand-icon:hover {
  transform: scale(1.05);
}

.sidebar-section {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-label {
  font-size: 11px;
  color: var(--tm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  padding: 8px 10px 4px;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--bl);
  margin-top: auto;
  flex-shrink: 0;
}

.footer-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--b);
  border-radius: var(--rl);
  padding: 14px;
  box-shadow: var(--shadow-sm);
}

.footer-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--t);
  margin-bottom: 8px;
}

.progress-bar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar-bg {
  flex: 1;
  height: 8px;
  background: var(--bg);
  border-radius: var(--r-pill);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--gradient);
  border-radius: var(--r-pill);
  transition: width 0.5s ease;
}

.progress-text {
  font-size: 13px;
  font-weight: 700;
  color: var(--p);
  min-width: 36px;
  text-align: right;
}

.footer-hint {
  font-size: 11px;
  color: var(--tm);
  margin-top: 6px;
}
</style>
