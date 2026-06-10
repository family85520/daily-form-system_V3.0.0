<template>
  <nav class="tab-bar">
    <button
      v-for="tab in tabs"
      :key="tab.name"
      :class="['tab-item', { active: currentRoute === tab.name }]"
      @click="navigateTo(tab.name)"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path v-for="(d, i) in tab.paths" :key="i" :d="d" />
        <polyline v-if="tab.polyline" :points="tab.polyline" />
        <circle v-if="tab.circle" :cx="tab.circle.cx" :cy="tab.circle.cy" :r="tab.circle.r" />
      </svg>
      <span>{{ tab.label }}</span>
    </button>
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
  background: var(--sf);
  display: flex;
  border-top: 1px solid var(--b);
  z-index: var(--z-header);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0 8px;
  font-size: 11px;
  color: var(--tm);
  cursor: pointer;
  transition: all 0.15s;
  border: none;
  background: none;
  font-weight: 500;
  font-family: inherit;
}

.tab-item svg {
  width: 20px;
  height: 20px;
  margin-bottom: 2px;
  stroke-width: 1.8;
}

.tab-item.active {
  color: var(--p);
  border-top: 2px solid var(--p);
  margin-top: -1px;
}

@media (min-width: 768px) {
  .tab-item {
    padding: 12px 0 10px;
    font-size: 12px;
  }

  .tab-item svg {
    width: 22px;
    height: 22px;
  }
}
</style>
