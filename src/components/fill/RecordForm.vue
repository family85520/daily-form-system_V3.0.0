<template>
  <div class="record-form">
    <!-- 非可填列（只读基础信息） -->
    <template v-if="fixedCols.length">
      <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--b);">
        <template v-for="col in fixedCols" :key="col.header">
          <div v-if="col.type === 'sequence'" style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
            <span style="color: var(--tm);">{{ col.header }}</span>
            <span style="font-weight: 600; color: var(--violet);">
              {{ seqDisplayValue(col.header) }}
              <span v-if="!existingSeqValue(col.header)" style="font-size: 10px;">🔄自动生成</span>
            </span>
          </div>
          <div v-else style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
            <span style="color: var(--tm);">{{ col.header }}</span>
            <span style="font-weight: 500;">{{ row[col.header] || '-' }}</span>
          </div>
        </template>
      </div>
    </template>

    <!-- 可填列 -->
    <FormField
      v-for="col in editableCols"
      :key="col.header"
      :column="col"
      :model-value="fieldValue(col.header)"
      :locked="isFilterField(col.header)"
      :locked-value="currentUser"
      :value-source="valueSource(col.header)"
      :sequence-value="col.type === 'sequence' ? seqDisplayValue(col.header) : undefined"
      @update:model-value="(val: string) => onFieldChange(col.header, val)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Template, EffectiveRow, ValueSource } from '@/types';
import { useDataStore } from '@/stores/useDataStore';
import { useSequence } from '@/composables/useSequence';
import { useFormSessionEdits } from '@/composables/useFormSessionEdits';
import FormField from '@/components/common/FormField.vue';

const props = defineProps<{
  template: Template;
  rowIndex: number;
  row: Record<string, string>;
  currentUser: string;
  currentDate: string;
  effectiveValues: EffectiveRow[];
}>();

const dataStore = useDataStore();
const { getNextSeqValue } = useSequence();
const { recordEdit } = useFormSessionEdits();

const fixedCols = computed(() =>
  props.template.columns.filter(c => !c.isEditable && c.included)
);

const editableCols = computed(() =>
  props.template.columns.filter(c => c.isEditable && c.included)
);

const effectiveRow = computed(() =>
  props.effectiveValues[props.rowIndex] || {}
);

// 获取当前行已有的提交数据
const existingRowData = computed(() => {
  const tplId = props.template.id;
  const cd = props.currentDate;
  const cu = props.currentUser;
  return ((dataStore.sub[tplId] || {})[cd] || {})[cu]?.[String(props.rowIndex)] || {};
});

// 序列字段：优先用已有提交数据，其次用基础数据，最后才生成新值
function existingSeqValue(header: string): string {
  // 1. 已有提交数据中的值
  if (existingRowData.value[header]) {
    return existingRowData.value[header];
  }
  // 2. 基础数据中的值
  if (props.row[header]) {
    return props.row[header];
  }
  // 3. 都没有，返回空
  return '';
}

function seqDisplayValue(header: string): string {
  const existing = existingSeqValue(header);
  if (existing) return existing;
  // 只有真正的新行才生成最新序列值
  return getNextSeqValue(props.template, header);
}

function isFilterField(header: string): boolean {
  return !!(props.template.filterField && header === props.template.filterField);
}

function fieldValue(header: string): string {
  const existing = existingRowData.value;
  let val = '';
  if (existing && Object.prototype.hasOwnProperty.call(existing, header)) {
    // store 有该字段 → 使用用户编辑/显式继承的值
    val = existing[header] || '';
  } else {
    // store 无该字段 → 回退到 effectiveValues（继承链：今日→昨日→基础）
    const ev = effectiveRow.value[header];
    val = ev ? ev.val : '';
  }
  // 日期字段标准化：YYYY/MM/DD → YYYY-MM-DD，无效值显示为空
  if (val) {
    const col = props.template.columns.find(c => c.header === header);
    if (col?.type === 'date') {
      const n = val.replace(/\//g, '-');
      val = /^\d{4}-\d{2}-\d{2}$/.test(n) ? n : '';
    }
  }
  return val;
}

function valueSource(header: string): ValueSource | 'empty' {
  const existing = existingRowData.value;
  if (existing && Object.prototype.hasOwnProperty.call(existing, header)) {
    const storeVal = (existing[header] || '').replace(/\//g, '-');
    const ev = effectiveRow.value[header];
    const evVal = ev ? (ev.val || '').replace(/\//g, '-') : '';
    if (storeVal === evVal) return ev ? ev.src : 'empty';
    return 'today';
  }
  // store 中无该字段 → 无来源标记（用户未接受任何数据）
  return 'empty';
}

function onFieldChange(header: string, value: string) {
  // 记录用户主动编辑（用于校验时区分"用户输入"与"继承数据"）
  recordEdit(props.rowIndex, header, value);

  // 实时写入本地 store（不触发服务器保存）
  const tplId = props.template.id;
  const cd = props.currentDate;
  const cu = props.currentUser;
  const ri = String(props.rowIndex);
  if (!dataStore.sub[tplId]) dataStore.sub[tplId] = {};
  if (!dataStore.sub[tplId][cd]) dataStore.sub[tplId][cd] = {};
  if (!dataStore.sub[tplId][cd][cu]) dataStore.sub[tplId][cd][cu] = {};
  if (!dataStore.sub[tplId][cd][cu][ri]) dataStore.sub[tplId][cd][cu][ri] = {};

  // 日期字段标准化：YYYY/MM/DD → YYYY-MM-DD
  let normalized = value;
  const col = props.template.columns.find(c => c.header === header);
  if (col?.type === 'date' && normalized) {
    normalized = normalized.replace(/\//g, '-');
    // 标准化后如果不符合合法日期格式，则视为空（防止浏览器占位符文本误写入）
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      normalized = '';
    }
  }

  dataStore.sub[tplId][cd][cu][ri][header] = normalized;
}
</script>

<style scoped>
.record-form {
  padding: 0 16px 16px;
}
</style>
