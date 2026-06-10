<template>
  <BaseModal
    :show="show"
    title="快速填写"
    max-width="560px"
    @close="onCancel"
  >
    <div style="font-size: 12px; color: var(--tm); margin-bottom: 16px; text-align: center;">
      {{ rowTitle }}
    </div>

    <template v-for="col in editableCols" :key="col.header">
      <div v-if="isFilterField(col.header)" class="form-group">
        <label class="field-label">
          {{ col.header }}
          <span v-if="col.required" class="required-mark">*</span>
          <span class="lock-badge">🔒已锁定</span>
        </label>
        <input class="field-input has-value" :value="currentUser" readonly :style="lockedStyle" />
      </div>

      <div v-else-if="col.type === 'sequence'" class="form-group">
        <label class="field-label">
          {{ col.header }}
          <span class="lock-badge">🔄自动生成</span>
        </label>
        <input class="field-input has-value" type="number" :value="getSeqValue(col.header)" readonly :style="lockedStyle" />
      </div>

      <FormField
        v-else
        :column="col"
        :model-value="getFieldValue(col.header)"
        :value-source="getValueSource(col.header)"
        @update:model-value="(val: string) => setFieldValue(col.header, val)"
      />
    </template>

    <template #footer>
      <div class="btn-group">
        <button class="btn btn-default" @click="onCancel">取消</button>
        <button class="btn btn-primary" @click="onSave">保存</button>
      </div>
    </template>
  </BaseModal>

  <InlineToast
    :show="showToast"
    :message="toastMsg"
    @close="closeInlineToast"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Template, EffectiveRow, ValueSource } from '@/types';
import { useDataStore } from '@/stores/useDataStore';
import { useValidation } from '@/composables/useValidation';
import { useSequence } from '@/composables/useSequence';
import { useToast } from '@/composables/useToast';
import FormField from '@/components/common/FormField.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import InlineToast from '@/components/common/InlineToast.vue';

const toastMsg = ref('');
const showToast = ref(false);

function showInlineToast(msg: string) {
  toastMsg.value = msg;
  showToast.value = true;
}

function closeInlineToast() {
  showToast.value = false;
}

const props = defineProps<{
  show: boolean;
  template: Template;
  rowIndex: number;
  currentUser: string;
  currentDate: string;
  effectiveValues: EffectiveRow[];
}>();

// 添加在 props 定义之后
const existingRowData = computed(() => {
  const tplId = props.template.id;
  const cd = props.currentDate;
  const cu = props.currentUser;
  return ((dataStore.sub[tplId] || {})[cd] || {})[cu]?.[String(props.rowIndex)] || {};
});

function getSeqValue(header: string): string {
  // 优先用已有值
  if (existingRowData.value[header]) return existingRowData.value[header];
  const baseRow = (props.template.rows && props.template.rows[props.rowIndex]) ? props.template.rows[props.rowIndex] : {};
  if (baseRow[header]) return baseRow[header];
  return getNextSeqValue(props.template, header);
}

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const dataStore = useDataStore();
const { validateAndApplyRules } = useValidation();
const { getNextSeqValue } = useSequence();
const { toastSuccess } = useToast();

const lockedStyle = {
  background: 'var(--vl)',
  color: 'var(--violet)',
  cursor: 'not-allowed',
  fontWeight: '600',
};

const fieldValues = ref<Record<string, string>>({});

const editableCols = computed(() =>
  props.template.columns.filter(c => c.isEditable && c.included)
);

const allCols = computed(() =>
  props.template.columns.filter(c => c.included)
);

const rowTitle = computed(() => {
  const row = props.template.rows?.[props.rowIndex];
  if (!row) return '第' + (props.rowIndex + 1) + '项';
  const tfs = props.template.titleFields || [];
  if (!tfs.length) return '第' + (props.rowIndex + 1) + '项';
  return tfs.map(h => row[h] || '').filter(v => v.trim()).join(' · ') || '第' + (props.rowIndex + 1) + '项';
});

watch(() => props.show, (val) => {
  if (val) {
    const values: Record<string, string> = {};
    editableCols.value.forEach(col => {
      const ev = props.effectiveValues[props.rowIndex]?.[col.header];
      values[col.header] = ev ? ev.val : '';
    });
    fieldValues.value = values;
  }
}, { immediate: true });

function onCancel() {
  emit('close');
}

function isFilterField(header: string): boolean {
  return !!(props.template.filterField && header === props.template.filterField);
}

function getFieldValue(header: string): string {
  return fieldValues.value[header] || '';
}

function setFieldValue(header: string, val: string) {
  fieldValues.value[header] = val;
}

function getValueSource(header: string): ValueSource | 'empty' {
  const ev = props.effectiveValues[props.rowIndex]?.[header];
  return ev ? ev.src : 'empty';
}

async function onSave() {
  try {
    const tpl = props.template;
    const ri = props.rowIndex;
    const ff = tpl.filterField;
    const cd = props.currentDate;
    const cu = props.currentUser;

    const baseRow = (tpl.rows && tpl.rows[ri]) ? tpl.rows[ri] : {};
    const rd: Record<string, string> = {};
    allCols.value.forEach(c => {
      if (ff && c.header === ff) {
        rd[c.header] = cu;
      } else if (c.type === 'sequence') {
        rd[c.header] = getSeqValue(c.header);
      } else if (c.isEditable) {
        rd[c.header] = fieldValues.value[c.header] || '';
      } else {
        rd[c.header] = baseRow[c.header] || '';
      }
    });

    const errors = validateAndApplyRules(tpl, ri, rd, allCols.value, ff, cu);
    if (errors.length) {
      showInlineToast('⚠️ ' + errors[0]);
      return;
    }

    if (!dataStore.sub[tpl.id]) dataStore.sub[tpl.id] = {};
    if (!dataStore.sub[tpl.id][cd]) dataStore.sub[tpl.id][cd] = {};
    if (!dataStore.sub[tpl.id][cd][cu]) dataStore.sub[tpl.id][cd][cu] = {};
    dataStore.sub[tpl.id][cd][cu][String(ri)] = rd;
    await dataStore.saveSubmission(tpl.id, cd, cu, { [String(ri)]: rd });
    toastSuccess('✓ 已保存');
    emit('saved');
    emit('close');
  } catch (_err) {
    console.error('快速填写保存失败:', _err);
    showInlineToast('⚠️ 保存失败，请重试');
  }
}
</script>

<style scoped>
.form-group {
  margin-bottom: 14px;
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

.field-input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--r);
  font-size: 14px;
  font-family: inherit;
  color: var(--t);
  background: var(--sf);
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
}

.field-input:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px var(--pl);
}

.field-input.has-value {
  border-color: var(--a);
  background: var(--al);
}
</style>
