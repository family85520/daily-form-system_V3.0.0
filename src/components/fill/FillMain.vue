<template>
  <div class="fill-main">
    <!-- 未选择用户 -->
    <div v-if="!currentUser" class="empty-state">
      <span class="empty-icon">👤</span>
      <p>请先选择填报人</p>
    </div>

    <!-- 已选择用户 -->
    <template v-else>
      <!-- 操作按钮 -->
      <div class="btn-group action-bar">
        <button class="btn btn-sm btn-info" @click="expandAll">展开全部</button>
        <button class="btn btn-sm btn-ghost" @click="collapseAll">收起全部</button>
      </div>

      <!-- 无数据提示 -->
      <div v-if="!filteredRows.length" class="cd" style="text-align: center; padding: 20px;">
        <p style="color: var(--tm);">{{ searchText ? '未找到匹配「' + searchText + '」的记录' : '当前筛选条件下无数据' }}</p>
      </div>

      <!-- 记录卡片列表 -->
      <RecordCard
        v-for="item in filteredRows"
        :key="item.idx"
        :template="template"
        :row-index="item.idx"
        :row="item.row"
        :current-user="currentUser"
        :current-date="currentDate"
        :user-data="userData"
        :effective-values="effectiveValues"
        :force-expand="forceExpand"
        @open-quick-fill="(ri) => $emit('open-quick-fill', ri)"
      />

      <!-- 底部操作（粘性定位，始终可见） -->
      <div class="sticky-footer">
        <div class="btn-group" style="margin-bottom: 8px;">
          <button class="btn btn-info" @click="$emit('add-row')">➕ 新增数据行</button>
          <button class="btn btn-default" @click="$emit('batch-add')">📋 批量新增</button>
        </div>
        <button class="btn btn-primary btn-block" @click="$emit('submit-all')">✓ 提交今日填报</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Template, EffectiveRow } from '@/types';
import RecordCard from './RecordCard.vue';

defineProps<{
  template: Template;
  currentUser: string;
  currentDate: string;
  filteredRows: { idx: number; row: Record<string, string> }[];
  effectiveValues: EffectiveRow[];
  userData: Record<string, Record<string, string>>;
  searchText: string;
}>();

defineEmits<{
  'submit-all': [];
  'add-row': [];
  'batch-add': [];
  'open-quick-fill': [rowIndex: number];
}>();

const forceExpand = ref<boolean | null>(null);

function expandAll() {
  forceExpand.value = true;
}

function collapseAll() {
  forceExpand.value = false;
}
</script>

<style scoped>
.fill-main {
  padding-bottom: 45px;
}

.action-bar {
  margin-bottom: 20px;
}

.sticky-footer {
  position: sticky;
  bottom: 64px;
  background: var(--bg);
  padding: 12px 0;
  border-top: 1px solid var(--b);
  z-index: 10;
}

@media (max-width: 767px) {
  .sticky-footer {
    bottom: 56px;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: var(--tm);
  gap: 8px;
}

.empty-icon {
  font-size: 48px;
  opacity: 0.5;
}
</style>
