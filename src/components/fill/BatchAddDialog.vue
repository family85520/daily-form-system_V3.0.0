<template>
  <BaseModal
    :show="show"
    title="➕ 批量新增数据行"
    max-width="560px"
    @close="onCancel"
  >
    <p style="font-size: 12px; color: var(--tm); margin-bottom: 12px; text-align: center;">
      每行一条记录，字段间用 | 分隔
    </p>

    <div v-if="template.filterField" class="info-box">
      🔒 筛选字段「{{ template.filterField }}」已锁定为当前填报人：<strong>{{ currentUser }}</strong>，无需填写该列
    </div>

    <div v-if="seqFields.length" class="info-box">
      🔄 序列字段「{{ seqFields.join('、') }}」由系统自动生成，无需填写该列
    </div>

    <div class="field-order-box">
      <div style="font-weight: 500; margin-bottom: 4px;">字段顺序（共{{ fieldOrder.length }}列）：</div>
      <div style="color: var(--ts);">{{ fieldOrderLabel }}</div>
      <div v-if="template.filterField" style="margin-top: 6px; color: var(--violet); font-size: 11px;">
        🔒 筛选字段「{{ template.filterField }}」已自动锁定，数据中无需包含
      </div>
      <div v-if="seqFields.length" style="margin-top: 4px; color: var(--violet); font-size: 11px;">
        🔄 序列字段「{{ seqFields.join('、') }}」由系统自动生成，数据中无需包含
      </div>
    </div>

    <div class="form-group">
      <label class="field-label">数据内容（每行一条）</label>
      <textarea
        v-model="batchText"
        class="field-textarea"
        rows="8"
        placeholder="示例：&#10;项目A | 100 | 备注1&#10;项目B | 200 | 备注2"
      />
    </div>

    <template #footer>
      <div class="btn-group">
        <button class="btn btn-default" @click="onCancel">取消</button>
        <button class="btn btn-primary" @click="onSave">💾 批量保存</button>
      </div>
    </template>
  </BaseModal>

  <ErrorListModal
    :show="showErrors"
    :errors="errorList"
    @close="showErrors = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Template } from '@/types';
import { useDataStore } from '@/stores/useDataStore';
import { useValidation } from '@/composables/useValidation';
import { useSequence } from '@/composables/useSequence';
import { useToast } from '@/composables/useToast';
import BaseModal from '@/components/common/BaseModal.vue';
import ErrorListModal from '@/components/common/ErrorListModal.vue';

const showErrors = ref(false);
const errorList = ref<string[]>([]);

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
const { toastSuccess, toastWarning } = useToast();

const batchText = ref('');

const allCols = computed(() => props.template.columns.filter(c => c.included));
const editableCols = computed(() => props.template.columns.filter(c => c.isEditable && c.included));

const seqFields = computed(() => {
  const fields: string[] = [];
  allCols.value.forEach(c => { if (c.type === 'sequence') fields.push(c.header); });
  return fields;
});

const fieldOrder = computed(() => {
  const ff = props.template.filterField;
  const seen: Record<string, boolean> = {};
  const order: string[] = [];
  allCols.value.forEach(c => {
    if (seen[c.header]) return;
    seen[c.header] = true;
    if (ff && c.header === ff) return;
    if (c.type === 'sequence') return;
    order.push(c.header);
  });
  return order;
});

const fieldOrderLabel = computed(() =>
  fieldOrder.value.map((f, i) => (i + 1) + '.' + f).join(' · ')
);

function onCancel() {
  emit('close');
}

watch(() => props.show, (val) => {
  if (val) batchText.value = '';
}, { immediate: true });

function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input;
  return input.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
}

async function onSave() {
  try {
    const tpl = props.template;
    const ff = tpl.filterField;
    const cu = props.currentUser;
    const cd = props.currentDate;

    if (!batchText.value.trim()) {
      toastWarning('请输入数据');
      return;
    }

    const lines = batchText.value.trim().split('\n').filter(l => l.trim());
    if (!lines.length) {
      toastWarning('没有有效数据');
      return;
    }

    if (!tpl.rows) tpl.rows = [];
    const startIdx = tpl.rows.length;
    const allErrors: string[] = [];
    const validRows: { row: Record<string, string>; ri: number }[] = [];

    lines.forEach((line, lineIdx) => {
      const values = line.split('|').map(v => sanitizeInput(v));
      const newRow: Record<string, string> = { _idx: String(startIdx + lineIdx) };
      let colIdx = 0;

      allCols.value.forEach(c => {
        if (ff && c.header === ff) {
          newRow[c.header] = cu;
        } else if (c.type === 'sequence') {
          newRow[c.header] = getNextSeqValue(tpl, c.header);
        } else {
          newRow[c.header] = values[colIdx] || '';
          colIdx++;
        }
      });

      allCols.value.forEach(c => {
        if (newRow[c.header] === undefined || newRow[c.header] === null) {
          newRow[c.header] = '';
        }
      });

      const lineErrors = validateAndApplyRules(tpl, 0, newRow, allCols.value, ff, '', lineIdx + 1);
      if (lineErrors.length) {
        allErrors.push(...lineErrors);
      } else {
        // 使用 startIdx + lineIdx 作为稳定索引，不因跳过无效行而错位
        validRows.push({ row: newRow, ri: startIdx + lineIdx });
      }
    });

    if (allErrors.length) {
      errorList.value = allErrors;
      showErrors.value = true;
      return;
    }

    if (!validRows.length) {
      toastWarning('没有有效数据被添加');
      return;
    }

    // 先准备新行数据（暂不推入模板）
    const newRows = validRows.map(item => {
      const submitData: Record<string, string> = {};
      editableCols.value.forEach(c => {
        if (ff && c.header === ff) {
          submitData[c.header] = cu;
        } else {
          submitData[c.header] = item.row[c.header] || '';
        }
      });
      return { row: item.row, submitData };
    });

    // 先保存模板（添加新行）
    if (!tpl.rows) tpl.rows = [];
    newRows.forEach(item => {
      tpl.rows.push(item.row);
    });

    try {
      await dataStore.saveTemplate(tpl);
    } catch (err) {
      console.error('批量新增模板保存失败:', err);
      toastWarning('批量新增失败：模板保存失败');
      // 回滚本地模板数据
      tpl.rows.splice(tpl.rows.length - newRows.length);
      throw err;
    }

    // 模板保存成功后，再保存提交数据
    for (const item of newRows) {
      await dataStore.saveSubmission(tpl.id, cd, cu, { [String(item.row._idx)]: item.submitData });
    }

    // 确保用户在场成员列表中
    if (!dataStore.members[tpl.id]) dataStore.members[tpl.id] = [];
    if (dataStore.members[tpl.id].indexOf(cu) === -1) {
      dataStore.members[tpl.id].push(cu);
    }
    await dataStore.saveMembers(tpl.id);
    toastSuccess('✓ 成功新增 ' + validRows.length + ' 条数据行');
    emit('saved');
    emit('close');
  } catch (_err) {
    console.error('批量新增失败:', _err);
    toastWarning('批量新增失败，请重试');
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

.field-order-box {
  margin-bottom: 12px;
  padding: 10px;
  background: var(--bl);
  border-radius: var(--r);
  font-size: 12px;
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

.field-textarea {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--r);
  font-size: 14px;
  font-family: inherit;
  color: var(--t);
  background: var(--sf);
  resize: vertical;
  min-height: 120px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.field-textarea:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px var(--pl);
}
</style>
