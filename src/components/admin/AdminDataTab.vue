<template>
  <div>
    <div class="admin-cd">
      <div class="cd-title">👁️ 填报数据查看</div>
      <div class="filter-bar">
        <label class="fl">模板：</label>
        <select class="fs" v-model="selTplId" @change="onTplChange">
          <option value="">-- 请选择模板 --</option>
          <option v-for="t in dataStore.tpls" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
        <label class="fl">日期：</label>
        <select class="fs" v-model="selDate" @change="onDateChange">
          <option value="">全部</option>
          <option v-for="d in dates" :key="d" :value="d">{{ d }}</option>
        </select>
        <label class="fl">填报人员：</label>
        <select class="fs" v-model="selUser" @change="currentPage = 0">
          <option value="">全部</option>
          <option v-for="u in users" :key="u" :value="u">{{ u }}</option>
        </select>
      </div>
    </div>

    <!-- 搜索框 + 批量操作 -->
    <div v-if="selTplId" class="admin-cd" style="padding: 12px 16px;">
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <input
          class="form-input"
          v-model="searchText"
          placeholder="🔍 搜索内容（日期、填报人、字段值）..."
          style="flex: 1; min-width: 200px;"
        />
        <button v-if="searchText" class="btn btn-sm btn-ghost" @click="searchText = ''">清除</button>
        <div style="display: flex; gap: 6px; margin-left: auto;">
          <button
            class="btn btn-sm btn-default"
            :disabled="!selectedRows.size"
            @click="deleteSelected"
          >
            🗑️ 删除选中{{ selectedRows.size ? ' (' + selectedRows.size + ')' : '' }}
          </button>
          <button
            class="btn btn-sm btn-default"
            style="color: var(--d);"
            :disabled="!tableRows.length"
            @click="deleteAll"
          >
            🗑️ 删除全部
          </button>
        </div>
      </div>
      <div v-if="searchText" style="font-size: 12px; color: var(--tm); margin-top: 6px;">
        搜索「{{ searchText }}」匹配到 {{ tableRows.length }} 条记录
      </div>
    </div>

    <div v-if="!selTplId" class="admin-cd" style="text-align: center; color: var(--tm); padding: 30px;">
      请先选择模板
    </div>
    <div v-else-if="!tableRows.length" class="admin-cd" style="text-align: center; color: var(--tm); padding: 30px;">
      当前筛选条件下无数据
    </div>
    <div v-else class="admin-cd">
      <div style="font-size: 12px; color: var(--tm); margin-bottom: 10px; display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
        <span style="font-weight: 600; color: var(--p);">{{ activeTplName }}</span>
        <span>共 {{ tableRows.length }} 条</span>
        <span v-if="tableRows.length > maxRender" style="color: var(--w);">（仅显示前{{ maxRender }}条）</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width: 36px;">
                <input type="checkbox" :checked="isAllSelected" @change="toggleAllRows" />
              </th>
              <th>日期</th>
              <th>填报人</th>
              <th v-for="c in allCols" :key="c.header">{{ c.header }}</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in paginatedRows" :key="currentPage * pageSize + idx">
              <td>
                <input type="checkbox" :checked="selectedRows.has(currentPage * pageSize + idx)" @change="toggleRow(currentPage * pageSize + idx)" />
              </td>
              <td style="font-weight: 500;">{{ row.date }}</td>
              <td>{{ row.user }}</td>
              <td v-for="c in allCols" :key="c.header" :style="getCellClass(row, c)">
                {{ getCellValue(row, c) }}
              </td>
              <td style="white-space: nowrap;">
                <button class="btn btn-sm" style="padding: 3px 8px; font-size: 11px; background: var(--a); color: #fff; border-color: var(--a);"
                  @click="onEdit(row)">✏️</button>
                <button class="btn btn-sm" style="padding: 3px 8px; font-size: 11px; color: var(--d);"
                  @click="onDelete(row)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div v-if="tableRows.length > pageSize" class="pager">
        <button class="btn btn-sm btn-ghost" :disabled="currentPage <= 0" @click="currentPage = Math.max(0, currentPage - 1)">◀</button>
        <span class="pager-text">{{ currentPage + 1 }} / {{ totalPages }}</span>
        <button class="btn btn-sm btn-ghost" :disabled="currentPage >= totalPages - 1" @click="currentPage = Math.min(totalPages - 1, currentPage + 1)">▶</button>
        <span class="pager-hint">每页 {{ pageSize }} 条 · 共 {{ tableRows.length }} 条</span>
      </div>
    </div>

    <!-- 编辑弹窗（复用快速填写样式与校验） -->
    <BaseModal
      :show="showEdit"
      title="编辑填报数据"
      max-width="560px"
      @close="showEdit = false"
    >
      <div style="font-size: 12px; color: var(--tm); margin-bottom: 16px; text-align: center;">
        {{ editRowTitle }}
      </div>

      <template v-for="col in editOnlyEditableCols" :key="col.header">
        <div class="form-group">
          <label class="field-label">
            {{ col.header }}
            <span v-if="col.required" class="required-mark">*</span>
          </label>
          <input
            v-if="col.type === 'text' || col.type === 'number' || col.type === 'date'"
            class="field-input"
            :type="col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'"
            v-model="editRowData[col.header]"
            :placeholder="col.constraints?.errorMessage || '请输入' + col.header"
          />
          <textarea
            v-else-if="col.type === 'textarea'"
            class="field-textarea"
            v-model="editRowData[col.header]"
            rows="3"
            :placeholder="'请输入' + col.header"
          ></textarea>
          <select
            v-else-if="col.type === 'select'"
            class="field-select"
            v-model="editRowData[col.header]"
          >
            <option value="">请选择</option>
            <option v-for="opt in (col.uniqueValues || [])" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <input
            v-else
            class="field-input"
            type="text"
            v-model="editRowData[col.header]"
            :placeholder="'请输入' + col.header"
          />
        </div>
      </template>

      <template #footer>
        <div class="btn-group">
          <button class="btn btn-default" @click="showEdit = false">取消</button>
          <button class="btn btn-primary" @click="onSaveEdit">💾 保存</button>
        </div>
      </template>
    </BaseModal>

    <!-- 内联 toast -->
    <InlineToast
      :show="showInlineToast"
      :message="inlineToastMsg"
      @close="showInlineToast = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDataStore } from '@/stores/useDataStore';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import { useValidation } from '@/composables/useValidation';
import BaseModal from '@/components/common/BaseModal.vue';
import InlineToast from '@/components/common/InlineToast.vue';
import type { Column } from '@/types';
import { MAX_RENDER_ROWS } from '@/constants';

interface TableRow {
  date: string;
  user: string;
  ri: string;
  rd: Record<string, string>;
  baseRow: Record<string, string>;
}

const dataStore = useDataStore();
const { confirmModal, confirmDanger } = useConfirm();
const { toastSuccess } = useToast();
const { validateAndApplyRules } = useValidation();

const selTplId = ref('');
const selDate = ref('');
const selUser = ref('');
const searchText = ref('');
const maxRender = MAX_RENDER_ROWS;

// 分页
const currentPage = ref(0);
const pageSize = 50;

// 批量选择
const selectedRows = ref(new Set<number>());

// 编辑弹窗
const showEdit = ref(false);
const editRowIndex = ref(-1);
const editDate = ref('');
const editUser = ref('');
const editRowData = ref<Record<string, string>>({});
const editRowTitle = ref('');

// 内联 toast
const inlineToastMsg = ref('');
const showInlineToast = ref(false);

function showInlineToastFn(msg: string) {
  inlineToastMsg.value = msg;
  showInlineToast.value = true;
}

const activeTpl = computed(() => dataStore.tpls.find(t => t.id === selTplId.value));
const activeTplName = computed(() => activeTpl.value?.name || '');
const allCols = computed(() => activeTpl.value?.columns?.filter(c => c.included) || []);
const editOnlyEditableCols = computed(() =>
  activeTpl.value?.columns?.filter(c => c.included && c.isEditable && c.type !== 'sequence') || []
);
const tplSub = computed(() => dataStore.sub[selTplId.value] || {});
const dates = computed(() => Object.keys(tplSub.value).sort().reverse());

const users = computed(() => {
  const result: string[] = [];
  const sub = tplSub.value;
  const datesToCheck = selDate.value ? [selDate.value] : Object.keys(sub);
  datesToCheck.forEach(date => {
    const daySub = sub[date] || {};
    Object.keys(daySub).forEach(u => { if (!result.includes(u)) result.push(u); });
  });
  return result.sort();
});

const tableRows = computed<TableRow[]>(() => {
  const tpl = activeTpl.value;
  if (!tpl) return [];
  const sub = tplSub.value;
  const result: TableRow[] = [];
  const datesToIterate = selDate.value ? [selDate.value] : Object.keys(sub).sort().reverse();
  const search = searchText.value.trim().toLowerCase();

  datesToIterate.forEach(date => {
    const daySub = sub[date] || {};
    const usersToIterate = selUser.value ? [selUser.value].filter(u => daySub[u]) : Object.keys(daySub);
    usersToIterate.forEach(user => {
      const ud = (daySub as Record<string, Record<string, Record<string, string>>>)[user];
      if (!ud) return;
      Object.keys(ud).forEach(ri => {
        const rd = ud[ri];
        if (!rd) return;
        if (!Object.values(rd).some(v => v && String(v).trim())) return;
        const baseRow = (tpl.rows && tpl.rows[parseInt(ri)]) ? tpl.rows[parseInt(ri)] : {};

        if (search) {
          const allVals = [
            date,
            user,
            ...Object.values(rd),
            ...Object.values(baseRow),
          ].map(v => String(v || '').toLowerCase());
          if (!allVals.some(v => v.includes(search))) return;
        }

        result.push({ date, user, ri, rd, baseRow });
      });
    });
  });

  return result;
});

const totalPages = computed(() => Math.max(1, Math.ceil(tableRows.value.length / pageSize)));

const paginatedRows = computed(() => {
  const start = currentPage.value * pageSize;
  return tableRows.value.slice(start, start + pageSize);
});

const isAllSelected = computed(() => {
  if (!paginatedRows.value.length) return false;
  return paginatedRows.value.every((_, idx) => {
    const globalIdx = currentPage.value * pageSize + idx;
    return selectedRows.value.has(globalIdx);
  });
});

function toggleRow(idx: number) {
  const s = new Set(selectedRows.value);
  if (s.has(idx)) s.delete(idx);
  else s.add(idx);
  selectedRows.value = s;
}

function toggleAllRows() {
  const s = new Set(selectedRows.value);
  if (isAllSelected.value) {
    paginatedRows.value.forEach((_, idx) => {
      s.delete(currentPage.value * pageSize + idx);
    });
  } else {
    paginatedRows.value.forEach((_, idx) => {
      s.add(currentPage.value * pageSize + idx);
    });
  }
  selectedRows.value = s;
}

function onTplChange() {
  selDate.value = '';
  selUser.value = '';
  selectedRows.value = new Set();
  searchText.value = '';
  currentPage.value = 0;
}

function onDateChange() {
  selUser.value = '';
  selectedRows.value = new Set();
  currentPage.value = 0;
}

function getCellValue(row: TableRow, col: Column): string {
  if (!col.isEditable) return row.baseRow[col.header] || '-';
  const val = row.rd[col.header] || '';
  return val || '未填';
}

function getCellClass(row: TableRow, col: Column): string {
  if (!col.isEditable) return 'background: #f1f3f5; color: #868e96;';
  const val = row.rd[col.header] || '';
  if (!val || !val.trim()) return 'background: #fef2f2; color: #dc2626; font-weight: 500;';
  const baseVal = row.baseRow[col.header] || '';
  if (val !== baseVal) return 'background: #dbeafe; font-weight: 600;';
  return '';
}

// ===== 编辑功能 =====
function onEdit(row: TableRow) {
  const tpl = activeTpl.value;
  if (!tpl) return;

  editRowIndex.value = parseInt(row.ri);
  editDate.value = row.date;
  editUser.value = row.user;

  // 构建编辑数据：基础字段 + 已填报字段
  const data: Record<string, string> = {};
  allCols.value.forEach(c => {
    if (c.isEditable) {
      data[c.header] = row.rd[c.header] || '';
    } else {
      data[c.header] = row.baseRow[c.header] || '';
    }
  });
  editRowData.value = data;

  // 标题（优先读取已保存的填报数据，回退到基础数据）
  const tfs = tpl.titleFields || [];
  const baseRow = row.baseRow;
  editRowTitle.value = tfs.length
    ? tfs.map(h => (row.rd[h] || baseRow[h] || '')).filter(v => v.trim()).join(' · ') || '第' + (row.ri + 1) + '项'
    : row.user + ' · ' + row.date + ' · 第' + (parseInt(row.ri) + 1) + '项';

  showEdit.value = true;
}

async function onSaveEdit() {
  try {
    const tpl = activeTpl.value;
    if (!tpl) return;

    const ri = editRowIndex.value;
    const date = editDate.value;
    const user = editUser.value;
    const ff = tpl.filterField;

    const rd: Record<string, string> = {};
    allCols.value.forEach(c => {
      if (ff && c.header === ff) {
        rd[c.header] = String(user);
      } else if (c.type === 'sequence') {
        rd[c.header] = String(editRowData.value[c.header] ?? '');
      } else if (c.isEditable) {
        rd[c.header] = String(editRowData.value[c.header] ?? '');
      } else {
        rd[c.header] = String(editRowData.value[c.header] ?? '');
      }
    });

    const errors = validateAndApplyRules(tpl, ri, rd, allCols.value, ff, user);
    if (errors.length) {
      showInlineToastFn('⚠️ ' + errors[0]);
      return;
    }

    if (!dataStore.sub[tpl.id]) dataStore.sub[tpl.id] = {};
    if (!dataStore.sub[tpl.id][date]) dataStore.sub[tpl.id][date] = {};
    if (!dataStore.sub[tpl.id][date][user]) dataStore.sub[tpl.id][date][user] = {};
    dataStore.sub[tpl.id][date][user][String(ri)] = rd;

    await dataStore.saveSubmission(tpl.id, date, user, { [String(ri)]: rd });
    toastSuccess('✓ 已保存');
    showEdit.value = false;
  } catch (_err) {
    console.error('保存编辑失败:', _err);
    showInlineToastFn('⚠️ 保存失败，请重试');
  }
}

// ===== 删除功能 =====
function onDelete(row: TableRow) {
  confirmModal('确定删除「' + row.user + '」在「' + row.date + '」的填报数据？', async () => {
    await dataStore.deleteSubmission(selTplId.value, row.date, row.user, parseInt(row.ri));
    // 从选中集合中移除
    selectedRows.value = new Set();
    toastSuccess('✓ 已删除');
  });
}

function deleteSelected() {
  if (!selectedRows.value.size) return;
  const count = selectedRows.value.size;
  confirmDanger('确定删除选中的 ' + count + ' 条填报数据？\n\n此操作不可恢复！', async () => {
    const rows = tableRows.value;
    const indices = [...selectedRows.value].sort((a, b) => b - a);
    for (const idx of indices) {
      const row = rows[idx];
      if (row) {
        await dataStore.deleteSubmission(selTplId.value, row.date, row.user, parseInt(row.ri));
      }
    }
    selectedRows.value = new Set();
    toastSuccess('✓ 已删除 ' + count + ' 条数据');
  });
}

function deleteAll() {
  const tpl = activeTpl.value;
  if (!tpl) return;
  const count = tableRows.value.length;
  confirmDanger('确定删除当前筛选条件下的全部 ' + count + ' 条填报数据？\n\n此操作不可恢复！', async () => {
    const rows = [...tableRows.value];
    for (const row of rows) {
      await dataStore.deleteSubmission(selTplId.value, row.date, row.user, parseInt(row.ri));
    }
    selectedRows.value = new Set();
    toastSuccess('✓ 已删除全部 ' + count + ' 条数据');
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

.filter-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.fl {
  font-size: 13px;
  color: var(--ts);
  font-weight: 500;
  white-space: nowrap;
}

.fs {
  flex: 1;
  min-width: 100px;
  padding: 8px 12px;
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

.fs:focus {
  border-color: var(--p);
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--b);
  border-radius: var(--r);
  max-height: 600px;
  overflow-y: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 500px;
}

th, td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--b);
}

th {
  background: var(--bl);
  font-weight: 600;
  color: var(--ts);
  font-size: 12px;
  position: sticky;
  top: 0;
  z-index: 1;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--r);
  font-size: 13px;
  font-family: inherit;
  color: var(--t);
  background: var(--sf);
  outline: none;
  transition: border-color 0.15s;
}

.form-input:focus {
  border-color: var(--p);
}

/* 编辑弹窗样式（与快速填写一致） */
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

.field-textarea {
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
  resize: vertical;
  min-height: 60px;
}

.field-textarea:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px var(--pl);
}

.field-select {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--r);
  font-size: 14px;
  font-family: inherit;
  color: var(--t);
  background: var(--sf);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
  -webkit-appearance: none;
  appearance: none;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.field-select:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px var(--pl);
}

.btn-group {
  display: flex;
  gap: 8px;
}

.btn-group .btn {
  flex: 1;
}

/* 分页 */
.pager {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0 0;
  border-top: 1px solid var(--b);
  margin-top: 12px;
}

.pager-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--ts);
  min-width: 60px;
  text-align: center;
}

.pager-hint {
  margin-left: auto;
  font-size: 12px;
  color: var(--tm);
}

.btn-ghost:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

:host {
  padding-bottom: 70px;
}

.tpl-name-display {
  font-size: 13px;
  font-weight: 500;
  color: var(--p);
  padding: 8px 12px;
  background: var(--p3);
  border: 1px solid var(--pl);
  border-radius: var(--r);
}
</style>
