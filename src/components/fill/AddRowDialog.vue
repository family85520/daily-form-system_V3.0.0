<template>
  <BaseModal
    :show="show"
    title="➕ 新增填报数据行"
    max-width="560px"
    @close="onCancel"
  >
    <p style="font-size: 12px; color: var(--tm); margin-bottom: 16px; text-align: center;">
      填写以下信息后点击保存，将新增一条数据行
    </p>

    <div v-if="template.filterField" class="info-box">
      🔒 筛选字段「{{ template.filterField }}」已锁定为当前填报人：<strong>{{ currentUser }}</strong>，无需填写该列
    </div>

    <div v-if="seqFields.length" class="info-box">
      🔄 序列字段「{{ seqFields.join('、') }}」由系统自动生成，无需填写该列
    </div>

    <template v-if="fixedCols.length">
      <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--b);">
        <div style="font-size: 13px; font-weight: 500; color: var(--ts); margin-bottom: 8px;">📌 基础信息</div>
        <template v-for="col in fixedCols" :key="col.header">
          <div v-if="isFilterField(col.header)" class="form-group">
            <label class="field-label">{{ col.header }} <span class="lock-badge">🔒已锁定</span></label>
            <input class="field-input has-value" :value="currentUser" readonly :style="lockedStyle" />
          </div>
          <div v-else-if="col.type === 'sequence'" class="form-group">
            <label class="field-label">{{ col.header }} <span class="lock-badge">🔄自动生成</span></label>
            <input class="field-input has-value" type="number" :value="getSeqValue(col.header)" readonly :style="lockedStyle" />
          </div>
          <div v-else class="form-group">
            <label class="field-label">
              {{ col.header }}
              <span v-if="col.required" class="required-mark">*</span>
            </label>
            <input class="field-input" :value="colValues[col.header] || ''" @input="onFixedInput(col.header, $event)" />
          </div>
        </template>
      </div>
    </template>

    <div style="font-size: 13px; font-weight: 500; color: var(--ts); margin-bottom: 8px;">✏️ 填报内容</div>
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
        :model-value="fieldValues[col.header] || ''"
        @update:model-value="(val: string) => { fieldValues[col.header] = val }"
      />
    </template>

    <div class="tip-box">
      💡 提示：新增的数据行将保存到模板中，下次填报时可直接使用
    </div>

    <template #footer>
      <div class="btn-group">
        <button class="btn btn-default" @click="onCancel">取消</button>
        <button class="btn btn-primary" @click="onSave">💾 保存并新增</button>
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
import type { Template } from '@/types';
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
  currentUser: string;
  currentDate: string;
}>();

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
const colValues = ref<Record<string, string>>({});

const allCols = computed(() => props.template.columns.filter(c => c.included));
const fixedCols = computed(() => props.template.columns.filter(c => !c.isEditable && c.included));
const editableCols = computed(() => props.template.columns.filter(c => c.isEditable && c.included));

const seqFields = computed(() => {
  const fields: string[] = [];
  allCols.value.forEach(c => { if (c.type === 'sequence') fields.push(c.header); });
  return fields;
});

function isFilterField(header: string): boolean {
  return !!(props.template.filterField && header === props.template.filterField);
}

function getSeqValue(header: string): string {
  return getNextSeqValue(props.template, header);
}

function onFixedInput(header: string, e: Event) {
  colValues.value[header] = (e.target as HTMLInputElement).value;
}

function onCancel() {
  emit('close');
}

watch(() => props.show, (val) => {
  if (val) {
    fieldValues.value = {};
    colValues.value = {};
    allCols.value.forEach(c => {
      if (c.type === 'date' && c.isEditable) {
        fieldValues.value[c.header] = props.currentDate;
      }
    });
  }
}, { immediate: true });

async function onSave() {
  try {
    const tpl = props.template;
    const ff = tpl.filterField;
    const cu = props.currentUser;
    const cd = props.currentDate;

    const newRow: Record<string, string> = { _idx: String(tpl.rows ? tpl.rows.length : 0) };
    let hasValue = false;

    allCols.value.forEach(c => {
      let val: string;
      if (ff && c.header === ff) {
        val = cu;
      } else if (c.type === 'sequence') {
        val = getSeqValue(c.header);
      } else if (c.isEditable) {
        val = fieldValues.value[c.header] || '';
      } else {
        val = colValues.value[c.header] || '';
      }
      newRow[c.header] = val;
      if (val) hasValue = true;
    });

    if (!hasValue) {
      showInlineToast('⚠️ 请至少填写一项数据');
      return;
    }

    if (ff) {
      const ffVal = newRow[ff] || '';
      if (!ffVal.trim()) {
        showInlineToast('⚠️ 筛选字段「' + ff + '」为必填项');
        return;
      }
    }

    allCols.value.forEach(c => {
      if (newRow[c.header] === undefined || newRow[c.header] === null) {
        newRow[c.header] = '';
      }
    });

    const errors = validateAndApplyRules(tpl, 0, newRow, allCols.value, ff, '');
    if (errors.length) {
      showInlineToast('⚠️ ' + errors[0]);
      return;
    }

    // 先确保成员列表中有该用户（本地）
    const memberName = ff ? String(newRow[ff]).trim() : cu;
    if (memberName && !dataStore.members[tpl.id]?.includes(memberName)) {
      if (!dataStore.members[tpl.id]) dataStore.members[tpl.id] = [];
      dataStore.members[tpl.id].push(memberName);
    }

    // 先将新行加入模板（本地）
    if (!tpl.rows) tpl.rows = [];
    const newIdx = tpl.rows.length;
    tpl.rows.push(newRow);

    // 先保存模板，成功后再保存提交数据
    await dataStore.saveTemplate(tpl);

    // 模板保存成功后，保存提交数据
    const submitData: Record<string, string> = {};
    editableCols.value.forEach(c => {
      if (ff && c.header === ff) {
        submitData[c.header] = cu;
      } else {
        submitData[c.header] = newRow[c.header] || '';
      }
    });

    await dataStore.saveSubmission(tpl.id, cd, cu, { [String(newIdx)]: submitData });

    // 确保成员也保存到后端
    await dataStore.saveMembers(tpl.id);

    toastSuccess('✓ 新增数据行成功');
    emit('saved');
    emit('close');
  } catch (_err) {
    console.error('新增数据行失败:', _err);
    // 回滚本地模板数据
    const tpl = props.template;
    if (tpl.rows && tpl.rows.length > 0) {
      tpl.rows.pop();
    }
    showInlineToast('⚠️ 新增失败，请重试');
  }
}
</script>

<style scoped>
.info-box {
  margin-bottom: 12px;
  padding: 10px;
  background: var(--vl);
  border: 1px solid var(--pl);
  border-radius: var(--r);
  font-size: 12px;
  color: var(--violet);
}

.tip-box {
  margin-top: 8px;
  padding: 10px;
  background: var(--bl);
  border-radius: var(--r);
  font-size: 12px;
  color: var(--ts);
}

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
