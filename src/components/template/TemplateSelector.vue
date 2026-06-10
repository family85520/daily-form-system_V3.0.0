<template>
  <div class="tpl-selector" ref="selectorRef">
    <button class="tpl-btn" :class="{ open: isOpen }" @click="toggle">
      <span>📋 {{ activeLabel }}</span>
      <span class="tpl-count">{{ activeCount }}</span>
      <span class="tpl-arrow">▼</span>
    </button>

    <div v-show="isOpen" class="tpl-dropdown">
      <div
        v-for="tpl in dataStore.tpls"
        :key="tpl.id"
        :class="['tpl-option', { active: dataStore.activeTemplateId === tpl.id }]"
        @click="pick(tpl.id)"
      >
        <div class="tpl-icon">{{ (tpl.name || '?').charAt(0) }}</div>
        <div class="tpl-info">
          <div class="tpl-name">{{ tpl.name }}</div>
          <div class="tpl-meta">
            {{ tpl.rows ? tpl.rows.length : 0 }}行 ·
            {{ editableCount(tpl) }}个可填 ·
            {{ dataStore.getTplMembers(tpl.id).length }}人
          </div>
        </div>
        <span v-if="dataStore.activeTemplateId === tpl.id" class="tpl-check">✓</span>
      </div>

      <div class="tpl-option tpl-option-all" @click="pick('')">
        📋 查看全部模板
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useDataStore } from '@/stores/useDataStore';
import type { Template } from '@/types';

const dataStore = useDataStore();
const isOpen = ref(false);
const selectorRef = ref<HTMLElement | null>(null);

const activeLabel = computed(() => {
  const tpl = dataStore.activeTemplate;
  return tpl ? tpl.name : '选择填报模板';
});

const activeCount = computed(() => {
  const tpl = dataStore.activeTemplate;
  if (tpl) return ' · ' + (tpl.rows ? tpl.rows.length : 0) + '项';
  return ' · ' + dataStore.tpls.length + '个模板';
});

function editableCount(tpl: Template): number {
  return tpl.columns ? tpl.columns.filter(c => c.isEditable && c.included).length : 0;
}

function toggle() {
  isOpen.value = !isOpen.value;
}

function close() {
  isOpen.value = false;
}

function pick(id: string) {
  dataStore.setActiveTemplate(id);
  close();
}

function handleClickOutside(e: MouseEvent) {
  if (selectorRef.value && !selectorRef.value.contains(e.target as Node)) {
    close();
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.tpl-selector {
  position: relative;
}

.tpl-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: var(--r);
  padding: 6px 12px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  width: 100%;
  transition: background 0.15s;
}

.tpl-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.tpl-count {
  font-size: 11px;
  opacity: 0.7;
}

.tpl-arrow {
  margin-left: auto;
  transition: transform 0.15s;
  font-size: 10px;
}

.tpl-btn.open .tpl-arrow {
  transform: rotate(180deg);
}

.tpl-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--sf);
  border: 1px solid var(--b);
  border-radius: var(--r);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  z-index: 9999;
  max-height: 280px;
  overflow-y: auto;
}

.tpl-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--t);
  cursor: pointer;
  transition: background 0.1s;
  border-bottom: 1px solid var(--bl);
}

.tpl-option:hover {
  background: var(--bl);
}

.tpl-option.active {
  background: var(--p3);
  color: var(--p);
  font-weight: 500;
}

.tpl-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--pl);
  color: var(--p);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.tpl-info {
  flex: 1;
  min-width: 0;
}

.tpl-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tpl-meta {
  font-size: 11px;
  color: var(--tm);
  margin-top: 1px;
}

.tpl-check {
  color: var(--ok);
  font-size: 14px;
}

.tpl-option-all {
  border-top: 1px solid var(--b);
  color: var(--p);
  font-weight: 500;
  justify-content: center;
}

.tpl-option-all:hover {
  background: var(--p3);
}
</style>
