<template>
  <div class="admin-cd">
    <div class="cd-title">🔀 交叉分析配置</div>

    <!-- 模板信息 -->
    <div class="config-section">
      <div class="section-label">当前模板</div>
      <div class="section-info">
        <span v-if="currentTpl" class="tpl-badge">{{ currentTpl.name }}</span>
        <span v-else class="tpl-badge tpl-badge-empty">请先在顶部选择模板</span>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="config-section">
      <div class="section-label">数据筛选</div>
      <div class="filter-row">
        <label class="filter-label">日期</label>
        <input type="date" class="filter-date" v-model="dateFrom" :max="dateTo || undefined" />
        <span style="color: var(--tm);">至</span>
        <input type="date" class="filter-date" v-model="dateTo" :min="dateFrom || undefined" />
        <label class="filter-label" style="margin-left: 8px;">填报人</label>
        <select class="filter-select" v-model="selMember">
          <option value="">全部</option>
          <option v-for="m in availableMembers" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>
    </div>

    <!-- 行维度 -->
    <div class="config-section">
      <div class="section-label">
        行维度
        <button class="btn btn-sm btn-ghost" @click="addRowDim" :disabled="rowDims.length >= 3">+ 添加</button>
      </div>
      <div v-if="!rowDims.length" class="dim-empty">点击"添加"选择行维度字段</div>
      <div v-else class="dim-list">
        <div v-for="(_dim, idx) in rowDims" :key="idx" class="dim-item">
          <select class="dim-select" v-model="rowDims[idx]">
            <option value="">请选择字段</option>
            <option v-for="c in availableCols" :key="c.header" :value="c.header">{{ c.header }}</option>
          </select>
          <button class="btn btn-sm btn-ghost" style="color: var(--d);" @click="rowDims.splice(idx, 1)">✕</button>
        </div>
      </div>
    </div>

    <!-- 列维度 -->
    <div class="config-section">
      <div class="section-label">
        列维度
        <button class="btn btn-sm btn-ghost" @click="addColDim" :disabled="colDims.length >= 2">+ 添加</button>
      </div>
      <div v-if="!colDims.length" class="dim-empty">点击"添加"选择列维度字段</div>
      <div v-else class="dim-list">
        <div v-for="(_dim, idx) in colDims" :key="idx" class="dim-item">
          <select class="dim-select" v-model="colDims[idx]">
            <option value="">请选择字段</option>
            <option v-for="c in availableCols" :key="c.header" :value="c.header">{{ c.header }}</option>
          </select>
          <button class="btn btn-sm btn-ghost" style="color: var(--d);" @click="colDims.splice(idx, 1)">✕</button>
        </div>
      </div>
    </div>

    <!-- 统计指标 -->
    <div class="config-section">
      <div class="section-label">
        统计指标
        <button class="btn btn-sm btn-ghost" @click="addMetric" :disabled="metrics.length >= 5">+ 添加</button>
      </div>
      <div v-if="!metrics.length" class="dim-empty">点击"添加"选择统计指标</div>
      <div v-else class="dim-list">
        <div v-for="(m, idx) in metrics" :key="idx" class="dim-item metric-item">
          <select class="dim-select" v-model="metrics[idx].func">
            <option value="count">计数</option>
            <option value="sum">求和</option>
            <option value="avg">平均</option>
            <option value="max">最大</option>
            <option value="min">最小</option>
            <option value="pct">百分比</option>
          </select>
          <select class="dim-select" v-model="metrics[idx].field" v-if="m.func !== 'count'">
            <option value="">请选择字段</option>
            <option v-for="c in numCols" :key="c.header" :value="c.header">{{ c.header }}</option>
          </select>
          <span v-else class="metric-label">记录数</span>
          <button class="btn btn-sm btn-ghost" style="color: var(--d);" @click="metrics.splice(idx, 1)">✕</button>
        </div>
      </div>
    </div>

    <!-- 生成按钮 -->
    <div style="margin-top: 16px;">
      <button
        class="btn btn-primary btn-block"
        @click="onGenerate"
        :disabled="!canGenerate"
      >🔀 生成交叉表</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useDataStore } from '@/stores/useDataStore';
import type { Column } from '@/types';
import type { CrossStatConfigData } from '@/components/stat/CrossAnalysis.vue';

const props = defineProps<{ tplId: string }>();
const emit = defineEmits<{ 'update:config': [config: CrossStatConfigData] }>();

const dataStore = useDataStore();

const dateFrom = ref('');
const dateTo = ref('');
const selMember = ref('');
const rowDims = ref<string[]>([]);
const colDims = ref<string[]>([]);
const metrics = ref<{ field: string; func: string }[]>([{ field: '', func: 'count' }]);

// 当前模板
const currentTpl = computed(() => {
  if (!props.tplId) return null;
  return dataStore.tpls.find(t => t.id === props.tplId) || null;
});

// 可用字段
const availableCols = computed<Column[]>(() => {
  if (!currentTpl.value) return [];
  return currentTpl.value.columns.filter(c => c.included);
});

// 数字字段
const numCols = computed<Column[]>(() => {
  if (!currentTpl.value) return [];
  return currentTpl.value.columns.filter(c => c.included && c.type === 'number');
});

// 可用成员
const availableMembers = computed(() => {
  if (!currentTpl.value) return [];
  return dataStore.getTplMembers(currentTpl.value.id);
});

// 日期联动
watch(dateFrom, (val) => {
  if (val && dateTo.value && dateTo.value < val) dateTo.value = val;
});
watch(dateTo, (val) => {
  if (val && dateFrom.value && dateFrom.value > val) dateFrom.value = val;
});

// 是否可生成
const canGenerate = computed(() => {
  if (!currentTpl.value) return false;
  if (!rowDims.value.length && !colDims.value.length) return false;
  // 检查维度是否都已选择
  if (rowDims.value.some(d => !d)) return false;
  if (colDims.value.some(d => !d)) return false;
  // 检查指标是否有效
  if (!metrics.value.length) return false;
  return metrics.value.every(m => {
    if (m.func === 'count') return true;
    return !!m.field;
  });
});

function addRowDim() {
  if (rowDims.value.length < 3) rowDims.value.push('');
}

function addColDim() {
  if (colDims.value.length < 2) colDims.value.push('');
}

function addMetric() {
  if (metrics.value.length < 5) metrics.value.push({ field: '', func: 'count' });
}

function onGenerate() {
  if (!canGenerate.value) return;
  emit('update:config', {
    rowDims: [...rowDims.value],
    colDims: [...colDims.value],
    metrics: metrics.value.map(m => ({ field: m.field, func: m.func })),
    dateFrom: dateFrom.value,
    dateTo: dateTo.value,
    selMember: selMember.value,
  });
}
</script>

<style scoped>
.admin-cd {
  background: var(--sf);
  border: 1px solid var(--b);
  border-radius: var(--rl);
  padding: 20px;
  margin-bottom: 16px;
}

.cd-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--t);
}

.config-section {
  margin-bottom: 16px;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ts);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tpl-badge {
  display: inline-block;
  padding: 4px 12px;
  background: var(--pl);
  color: var(--p);
  border-radius: var(--r);
  font-size: 13px;
  font-weight: 500;
}

.tpl-badge-empty {
  background: var(--bl);
  color: var(--tm);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 12px;
  color: var(--ts);
  font-weight: 500;
  white-space: nowrap;
}

.filter-date {
  flex: 1;
  min-width: 130px;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: var(--r);
  font-size: 13px;
  font-family: inherit;
  color: var(--t);
  background: var(--sf);
  outline: none;
}

.filter-date:focus {
  border-color: var(--p);
}

.filter-select {
  flex: 1;
  min-width: 100px;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: var(--r);
  font-size: 13px;
  font-family: inherit;
  color: var(--t);
  background: var(--sf);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;
  -webkit-appearance: none;
  appearance: none;
  outline: none;
}

.filter-select:focus {
  border-color: var(--p);
}

.dim-empty {
  font-size: 12px;
  color: var(--tm);
  padding: 8px 12px;
  background: var(--bl);
  border-radius: var(--r);
  text-align: center;
}

.dim-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dim-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.metric-item {
  background: var(--bl);
  padding: 8px 10px;
  border-radius: var(--r);
  border: 1px solid var(--b);
}

.dim-select {
  flex: 1;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: var(--r);
  font-size: 13px;
  font-family: inherit;
  color: var(--t);
  background: var(--sf);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 24px;
  -webkit-appearance: none;
  appearance: none;
  outline: none;
}

.dim-select:focus {
  border-color: var(--p);
}

.metric-label {
  flex: 1;
  font-size: 13px;
  color: var(--tm);
  padding: 7px 10px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 18px;
  border: 1px solid transparent;
  border-radius: var(--r);
  font-size: 14px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 40px;
  line-height: 1.3;
  background: none;
  outline: none;
}

.btn-primary {
  background: var(--p);
  color: #fff;
  border-color: var(--p);
}

.btn-primary:hover:not(:disabled) {
  background: var(--p2);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-ghost {
  background: transparent;
  color: var(--p);
  border: none;
  padding: 4px 8px;
  min-height: auto;
  font-size: 12px;
}

.btn-ghost:hover:not(:disabled) {
  background: var(--bl);
}

.btn-ghost:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
  min-height: 28px;
}

.btn-block {
  width: 100%;
}
</style>
