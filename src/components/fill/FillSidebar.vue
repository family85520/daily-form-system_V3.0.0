<template>
  <aside class="fill-sidebar">
    <!-- 统计卡片 -->
    <div class="stat-bar">
      <div
        class="stat-card stat-filled"
        :class="{ selected: statFilter === 'filled', disabled: !currentUser }"
        @click="onStatClick('filled')"
      >
        <div class="stat-num">{{ fillStats.filled }}</div>
        <div class="stat-label">已填报</div>
      </div>
      <div
        class="stat-card stat-unfilled"
        :class="{ selected: statFilter === 'unfilled', disabled: !currentUser }"
        @click="onStatClick('unfilled')"
      >
        <div class="stat-num">{{ fillStats.remaining }}</div>
        <div class="stat-label">未填报</div>
      </div>
      <div
        class="stat-card stat-total"
        :class="{ selected: statFilter === 'all', disabled: !currentUser }"
        @click="onStatClick('all')"
      >
        <div class="stat-num">{{ fillStats.total }}</div>
        <div class="stat-label">总行数</div>
      </div>
    </div>

    <!-- 模板行数 -->
    <div class="stat-bar" style="margin-top: -8px;">
      <div class="stat-card stat-template">
        <div class="stat-num" style="color: var(--violet);">{{ fillStats.templateRows }}</div>
        <div class="stat-label">模板行数</div>
      </div>
    </div>

    <!-- 模板信息 + 切换 + 重置 -->
    <div class="cd" style="padding: 12px 14px;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 13px; font-weight: 600; color: var(--p);">📋 {{ template.name }}</span>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-sm btn-default" @click="$emit('back')">切换</button>
          <button class="btn btn-sm btn-default" style="color: var(--d);" @click="onReset">重置</button>
        </div>
      </div>
    </div>

    <!-- 用户选择 -->
    <div class="cd">
      <div class="cd-title">👤 选择填报人（{{ members.length }}人）</div>
      <select
        class="user-select"
        :value="currentUser"
        @change="onUserChange"
      >
        <option value="">-- 请选择填报人 --</option>
        <option
          v-for="opt in userOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>
    </div>

    <!-- 数据搜索（仅填报人已选后显示） -->
    <transition name="search-fade">
      <div v-if="currentUser" class="cd search-section">
        <input
          class="search-input"
          type="text"
          placeholder="🔍 搜索字段内容..."
          :value="searchTextModel"
          @input="searchTextModel = ($event.target as HTMLInputElement).value"
        />
        <button
          v-if="searchTextModel"
          class="search-clear"
          @click="searchTextModel = ''"
        >✕</button>
        <div v-if="searchTextModel" class="search-hint">
          匹配 {{ matchCount }} 条记录
        </div>
      </div>
    </transition>

    <!-- 继承提示 -->
    <div v-if="showInheritHint" class="cd inherit-card">
      <div class="cd-title" style="color: var(--violet);">📥 检测到昨日数据</div>
      <p style="font-size: 13px; color: var(--ts); margin-bottom: 10px;">是否继承昨日填报数据？</p>
      <div class="btn-group">
        <button class="btn btn-sm btn-info" @click="$emit('inherit-prev')">📥 继承昨日</button>
        <button class="btn btn-sm btn-primary" @click="$emit('inherit-base')">📊 基础数据</button>
      </div>
    </div>

    <!-- 图例 -->
    <div v-if="currentUser" class="cd" style="padding: 10px 14px;">
      <div style="font-size: 12px; color: var(--tm); display: flex; gap: 10px; flex-wrap: wrap;">
        <span><span class="base-badge">📊基础</span> 模板</span>
        <span><span class="inherit-badge">📥昨日</span> 继承</span>
        <span><span class="changed-badge">✏️已改</span> 修改</span>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDataStore } from '@/stores/useDataStore';
import { useConfirm } from '@/composables/useConfirm';
import type { Template, StatFilterMode } from '@/types';

const props = defineProps<{
  template: Template;
  currentUser: string;
  currentDate: string;
  statFilter: StatFilterMode;
  fillStats: { filled: number; total: number; remaining: number; templateRows: number };
  showInheritHint: boolean;
  searchText: string;
  matchCount: number;
}>();

const emit = defineEmits<{
  'select-user': [user: string];
  'set-filter': [filter: StatFilterMode];
  'inherit-prev': [];
  'inherit-base': [];
  'back': [];
  'reset': [];
  'update:searchText': [value: string];
}>();

const searchTextModel = computed({
  get: () => props.searchText,
  set: (val: string) => emit('update:searchText', val),
});

const dataStore = useDataStore();
const { confirmModal } = useConfirm();

const members = computed(() => dataStore.getTplMembers(props.template.id));

const userOptions = computed(() => {
  return members.value.map(m => {
    const ds = (dataStore.sub[props.template.id] || {})[props.currentDate] || {};
    const hasData = ds[m] ? true : false;
    return {
      label: m + (hasData ? ' ✓' : ''),
      value: m,
    };
  });
});

function onStatClick(filter: StatFilterMode) {
  if (!props.currentUser) return;
  emit('set-filter', filter);
}

function onUserChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value;
  emit('select-user', val);
}

function onReset() {
  confirmModal('确定要将当前填报人今日的所有填报数据重置为基础数据吗？', () => {
    emit('reset');
  });
}
</script>

<style scoped>
/* 移动端：不固定，跟随页面滚动，宽度自适应 */
.fill-sidebar {
  align-self: start;
  width: 100%;
  max-width: 100%;
}

/* 桌面端：fixed 固定位置，距视口左边 260px（导航220 + 间距40），永不随滚动移动 */
@media (min-width: 768px) {
  .fill-sidebar {
    position: fixed;
    top: calc(var(--header-height) + var(--sp-6));
    left: 260px;
    width: 340px;
    z-index: 10;
  }
}

@media (min-width: 1024px) {
  .fill-sidebar {
    width: 380px;
  }
}

@media (min-width: 1024px) {
  .fill-sidebar {
    width: 380px;
  }
}

.stat-bar {
  display: flex;
  gap: var(--sp-3);
  margin-bottom: var(--sp-4);
  min-height: 89px;
}

.stat-card {
  flex: 1;
  min-width: 0;
  background: var(--sf);
  border: none;
  border-radius: var(--rl);
  padding: 16px 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-sm);
}

.stat-card:hover:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

.stat-card:active:not(.disabled) {
  transform: scale(0.97);
}

.stat-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 已填报：绿色系 */
.stat-filled {
  border-color: var(--ok);
}

.stat-filled.selected {
  background: var(--gradient);
  color: #fff;
  border-color: var(--ok);
  box-shadow: var(--shadow-hover);
}

.stat-filled.selected .stat-num { color: #fff; }
.stat-filled.selected .stat-label { color: rgba(255,255,255,0.85); }

/* 未填报：红色系 */
.stat-unfilled {
  border-color: var(--d);
}

.stat-unfilled.selected {
  background: var(--gradient);
  color: #fff;
  border-color: var(--d);
  box-shadow: var(--shadow-hover);
}

.stat-unfilled.selected .stat-num { color: #fff; }
.stat-unfilled.selected .stat-label { color: rgba(255,255,255,0.85); }

/* 总行数：蓝色系 */
.stat-total {
  border-color: var(--p);
}

.stat-total.selected {
  background: var(--gradient);
  color: #fff;
  border-color: var(--p);
  box-shadow: var(--shadow-hover);
}

.stat-total.selected .stat-num { color: #fff; }
.stat-total.selected .stat-label { color: rgba(255,255,255,0.85); }

/* 模板行数：紫色系 */
.stat-template {
  border-color: var(--b);
  cursor: default;
  background: var(--card-bg);
}

.stat-num {
  font-size: var(--text-2xl);
  font-weight: 700;
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--tm);
  margin-top: 2px;
  font-weight: 500;
}

.cd {
  background: var(--sf);
  border: 1px solid var(--b);
  border-radius: var(--rl);
  padding: 18px;
  margin-bottom: var(--sp-4);
  box-shadow: var(--shadow-sm);
}

.cd-title {
  font-size: var(--text-base);
  font-weight: 600;
  margin-bottom: var(--sp-3);
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--t);
}

/* 继承提示卡片 */
.inherit-card {
  background: var(--vl);
  border-color: var(--violet);
  box-shadow: var(--shadow-sm);
}


.user-select {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid var(--b);
  border-radius: var(--r);
  font-size: var(--text-base);
  font-family: inherit;
  color: var(--t);
  background: var(--sf);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%235F8E8B' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
  -webkit-appearance: none;
  appearance: none;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.user-select:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px rgba(38, 166, 154, 0.15);
}

.user-select:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px rgba(38, 166, 154, 0.15);
}

.base-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--a);
  background: var(--al);
  padding: 1px 6px;
  border-radius: 3px;
  margin-left: 6px;
}

.inherit-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--violet);
  background: var(--vl);
  padding: 1px 6px;
  border-radius: 3px;
  margin-left: 6px;
}

.changed-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--w);
  background: var(--wl);
  padding: 1px 6px;
  border-radius: 3px;
  margin-left: 6px;
}

/* ===== 数据搜索 ===== */
.search-section {
  padding: 12px 14px;
  position: relative;
}

.search-input {
  width: 100%;
  padding: 9px 36px 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--r);
  font-size: 13px;
  font-family: inherit;
  color: var(--t);
  background: var(--sf);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.search-input:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px var(--pl);
}

.search-input::placeholder {
  color: var(--tm);
}

.search-clear {
  position: absolute;
  right: 24px;
  top: 16px;
  width: 22px;
  height: 22px;
  border: none;
  background: var(--b);
  color: var(--ts);
  border-radius: 50%;
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.search-clear:hover {
  background: var(--d);
  color: #fff;
}

.search-hint {
  font-size: 11px;
  color: var(--tm);
  margin-top: 6px;
  padding-left: 2px;
}

.search-fade-enter-active,
.search-fade-leave-active {
  transition: opacity 0.2s ease, max-height 0.25s ease;
  overflow: hidden;
}

.search-fade-enter-from,
.search-fade-leave-to {
  opacity: 0;
  max-height: 0;
}

.search-fade-enter-to,
.search-fade-leave-from {
  opacity: 1;
  max-height: 100px;
}
</style>
