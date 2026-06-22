<template>
  <nav class="tab-bar">
    <div class="tab-bar-inner">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        :class="['tab-item', { active: currentRoute === tab.name }]"
        @click="navigateTo(tab.name)"
      >
        <div class="tab-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path v-for="(d, i) in tab.paths" :key="i" :d="d" />
            <polyline v-if="tab.polyline" :points="tab.polyline" />
            <circle v-if="tab.circle" :cx="tab.circle.cx" :cy="tab.circle.cy" :r="tab.circle.r" />
          </svg>
        </div>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const currentRoute = computed(() => route.name as string);

interface TabConfig {
  name: string;
  label: string;
  paths: string[];
  polyline?: string;
  circle?: { cx: number; cy: number; r: number };
}

const tabs: TabConfig[] = [
  {
    name: 'fill',
    label: '填报',
    paths: [
      'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7',
      'M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
    ],
  },
  {
    name: 'history',
    label: '历史',
    paths: [],
    circle: { cx: 12, cy: 12, r: 10 },
    polyline: '12 6 12 12 16 14',
  },
  {
    name: 'stat',
    label: '统计',
    paths: [
      'M18 20V10',
      'M12 20V4',
      'M6 20v-6',
    ],
  },
  {
    name: 'admin',
    label: '管理',
    paths: [
      'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
    ],
    circle: { cx: 12, cy: 12, r: 3 },
  },
];

function navigateTo(name: string) {
  if (route.name !== name) {
    router.push({ name });
  }
}
</script>

<style scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: var(--max-width);
  z-index: var(--z-header);
  padding: 0 16px 8px;
  background: linear-gradient(to top, var(--bg) 80%, transparent);
}

@media (max-width: 767px) {
  .tab-bar {
    padding: 0 12px 6px;
  }
}

@media (min-width: 768px) {
  .tab-bar {
    display: none;
  }
}

.tab-bar-inner {
  background: var(--sf);
  border: 1px solid var(--b);
  border-radius: var(--rl);
  display: flex;
  padding: 4px;
  box-shadow: var(--shadow);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0 6px;
  font-size: 11px;
  color: var(--tm);
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  background: none;
  font-weight: 500;
  font-family: var(--font-family);
  border-radius: 14px;
}

.tab-item:hover {
  color: var(--p);
  background: var(--p3);
}

.tab-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-bottom: 2px;
  transition: all 0.2s;
}

.tab-icon svg {
  width: 20px;
  height: 20px;
}

.tab-item.active .tab-icon {
  background: var(--gradient);
  color: #fff;
  box-shadow: var(--shadow-sm);
}

.tab-item.active .tab-label {
  color: var(--p);
  font-weight: 600;
}

@media (max-width: 767px) {
  .tab-bar {
    padding: 0 12px 6px;
  }

  .tab-bar-inner {
    padding: 3px;
  }

  .tab-item {
    padding: 6px 0 4px;
    font-size: 10px;
  }

  .tab-icon {
    width: 28px;
    height: 28px;
  }

  .tab-icon svg {
    width: 18px;
    height: 18px;
  }
}
</style>
