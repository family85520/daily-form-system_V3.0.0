<template>
  <div class="form-group">
    <label class="field-label">
      {{ column.header }}
      <span v-if="column.required" class="required-mark">*</span>
      <span v-if="locked" class="lock-badge">🔒已锁定</span>
      <template v-if="!locked && valueSource">
        <span v-if="valueSource === 'base'" class="base-badge">📊基础</span>
        <span v-else-if="valueSource === 'prev'" class="inherit-badge">📥昨日</span>
        <span v-else-if="valueSource === 'today'" class="changed-badge">✏️已改</span>
      </template>
    </label>

    <!-- 锁定字段（筛选字段） -->
    <input
      v-if="locked"
      class="field-input has-value"
      :value="lockedValue"
      readonly
      :style="lockedStyle"
    />

    <!-- 序列字段 -->
    <template v-else-if="column.type === 'sequence'">
      <input
        class="field-input has-value"
        type="number"
        :value="sequenceValue"
        readonly
        :style="lockedStyle"
      />
      <div class="field-hint">🔄 系统自动生成</div>
    </template>

    <!-- 文本 -->
    <input
      v-else-if="column.type === 'text'"
      class="field-input"
      :class="{ 'has-value': modelValue }"
      :placeholder="'请输入' + column.header"
      :value="modelValue"
      @input="onInput"
    />

    <!-- 数字 -->
    <input
      v-else-if="column.type === 'number'"
      class="field-input"
      type="number"
      :class="{ 'has-value': modelValue }"
      :placeholder="'请输入' + column.header"
      :value="modelValue"
      @input="onInput"
    />

    <!-- 多行文本 -->
    <textarea
      v-else-if="column.type === 'textarea'"
      class="field-textarea"
      :class="{ 'has-value': modelValue }"
      :placeholder="'请输入' + column.header"
      :value="modelValue"
      @input="onTextarea"
    />

    <!-- 下拉选择 -->
    <select
      v-else-if="column.type === 'select'"
      class="field-select"
      :class="{ 'has-value': modelValue }"
      :value="modelValue"
      @change="onSelect"
    >
      <option value="">请选择</option>
      <option
        v-for="opt in column.uniqueValues"
        :key="opt"
        :value="opt"
      >
        {{ opt }}
      </option>
    </select>

    <!-- 日期 -->
    <input
      v-else-if="column.type === 'date'"
      class="field-input"
      type="date"
      :class="{ 'has-value': displayValue }"
      :value="displayValue"
      @input="onInput"
    />

    <!-- 兜底：文本输入 -->
    <input
      v-else
      class="field-input"
      :class="{ 'has-value': modelValue }"
      :placeholder="'请输入' + column.header"
      :value="modelValue"
      @input="onInput"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Column, ValueSource } from '@/types';

const props = withDefaults(defineProps<{
  /** 字段定义 */
  column: Column;
  /** 当前值（v-model） */
  modelValue: string;
  /** 是否锁定（筛选字段不可编辑） */
  locked?: boolean;
  /** 锁定时显示的值 */
  lockedValue?: string;
  /** 值来源标记（base/prev/today/empty） */
  valueSource?: ValueSource | 'empty';
  /** 序列字段的自动值 */
  sequenceValue?: string;
}>(), {
  locked: false,
  lockedValue: '',
  valueSource: undefined,
  sequenceValue: '',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const lockedStyle = {
  background: 'var(--vl)',
  color: 'var(--violet)',
  cursor: 'not-allowed',
  fontWeight: '600',
};

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value);
}

// 日期字段标准化：YYYY/MM/DD → YYYY-MM-DD，确保始终返回合法字符串
const displayValue = computed(() => {
  if (props.column.type === 'date') {
    const raw = props.modelValue ?? '';
    if (!raw) return '';
    const v = raw.replace(/\//g, '-');
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
  }
  return props.modelValue ?? '';
});

function onTextarea(e: Event) {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value);
}

function onSelect(e: Event) {
  emit('update:modelValue', (e.target as HTMLSelectElement).value);
}
</script>

<style scoped lang="scss">
.form-group {
  margin-bottom: 14px;

  &:last-child {
    margin-bottom: 0;
  }
}

.field-label {
  display: block;
  font-size: 13px;
  color: var(--ts);
  margin-bottom: 5px;
  font-weight: 500;
}

.required-mark {
  color: #ef4444;
  font-size: 16px;
  font-weight: 700;
  margin-left: 2px;
  vertical-align: middle;
  text-shadow: 0 0 2px rgba(239, 68, 68, 0.3);
}

.lock-badge {
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

// 公共输入框样式
@mixin field-base {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--r);
  font-size: 14px;
  font-family: inherit;
  color: var(--t);
  background: var(--sf);
  transition: border-color 0.15s, box-shadow 0.15s;
  -webkit-appearance: none;
  appearance: none;
  outline: none;

  &:focus {
    border-color: var(--p);
    box-shadow: 0 0 0 3px var(--pl);
  }

  &.has-value {
    border-color: var(--a);
    background: var(--al);
  }
}

.field-input {
  @include field-base;
}

.field-textarea {
  @include field-base;
  resize: vertical;
  min-height: 80px;
}

.field-select {
  @include field-base;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;
}

.field-hint {
  font-size: 11px;
  color: var(--violet);
  margin-top: 4px;
}
</style>
