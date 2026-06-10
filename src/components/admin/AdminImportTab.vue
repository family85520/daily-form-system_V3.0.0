<template>
  <div>
    <div class="admin-cd">
      <div class="cd-title">📤 导入创建模板</div>
      <p style="font-size: 13px; color: var(--ts); margin-bottom: 12px;">每次导入将创建一个新的填报模板</p>
      <div class="import-tabs">
        <button :class="['import-tab', { active: importType === 'excel' }]" @click="importType = 'excel'">📊 Excel导入</button>
        <button :class="['import-tab', { active: importType === 'json' }]" @click="importType = 'json'">📄 JSON导入</button>
      </div>

      <div v-if="importType === 'excel'" class="drop-zone" @click="triggerExcel" @dragover.prevent @drop.prevent="onExcelDrop">
        <input ref="excelInput" type="file" accept=".xlsx,.xls,.csv" style="display: none;" @change="onExcelSelect" />
        <span class="drop-icon">📊</span>
        <div class="drop-text">点击或拖拽上传 Excel</div>
        <div class="drop-hint">.xlsx / .xls / .csv · 每次导入创建新模板</div>
      </div>

      <div v-else class="drop-zone" @click="triggerJson" @dragover.prevent @drop.prevent="onJsonDrop">
        <input ref="jsonInput" type="file" accept=".json" style="display: none;" @change="onJsonSelect" />
        <span class="drop-icon">📄</span>
        <div class="drop-text">点击或拖拽上传 JSON</div>
        <div class="drop-hint">之前导出的模板文件</div>
      </div>
    </div>

    <!-- 预览 -->
    <div v-if="previewData" class="admin-cd">
      <div class="preview-info">
        <span>✓</span>
        <div><strong>{{ previewData.fileName }}</strong><br>{{ previewData.headers.length }} 列 · {{ previewData.rows.length }} 行</div>
      </div>

      <div class="cd-title" style="margin-top: 12px;">👁️ 数据预览</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th v-for="h in previewData.headers" :key="h">{{ h }}</th></tr></thead>
          <tbody>
            <tr v-for="(row, idx) in previewData.rows.slice(0, 5)" :key="idx">
              <td v-for="(cell, ci) in row" :key="ci">{{ cell }}</td>
            </tr>
            <tr v-if="previewData.rows.length > 5">
              <td :colspan="previewData.headers.length" style="text-align: center; color: var(--tm);">...共{{ previewData.rows.length }}行</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="admin-cd" style="margin-top: 12px;">
        <div class="cd-title">🔍 筛选字段</div>
        <p style="font-size: 12px; color: var(--tm); margin-bottom: 10px;">选择一个字段作为筛选依据（通常是姓名列）</p>
        <select class="form-select" v-model="filterField">
          <option value="">-- 不启用 --</option>
          <option v-for="h in previewData.headers" :key="h" :value="h">{{ h }}</option>
        </select>
      </div>

      <div class="admin-cd" style="margin-top: 12px;">
        <div class="cd-title">🏷️ 行标题字段</div>
        <p style="font-size: 12px; color: var(--tm); margin-bottom: 10px;">选择用于标识每行数据的字段</p>
        <div class="title-chips">
          <div v-for="h in previewData.headers" :key="h"
            :class="['title-chip', { on: titleFields.includes(h) }]"
            @click="toggleTitle(h)">{{ h }}</div>
        </div>
      </div>

      <div class="cd-title" style="margin-top: 12px;">🔧 字段配置</div>
      <div style="font-size: 12px; color: var(--tm); margin-bottom: 12px;">
        <strong style="color: var(--a);">🔒固定</strong> 只读 ·
        <strong style="color: var(--w);">✏️可填</strong> 需填报 ·
        <strong style="color: var(--d);">*必填</strong>
      </div>
      <div class="field-grid">
        <div v-for="(col, idx) in columns" :key="idx" class="field-card">
          <div class="field-card-header">
            <div class="field-num">{{ idx + 1 }}</div>
            <div class="field-name">{{ col.header }}</div>
          </div>
          <div class="field-row">
            <span class="field-label">名称</span>
            <input class="form-input-sm" v-model="col.header" />
          </div>
          <div class="field-row">
            <span class="field-label">类型</span>
            <select class="form-select-sm" v-model="col.type" @change="onImportTypeChange(idx, col)">
              <option value="text">文本</option>
              <option value="number">数字</option>
              <option value="textarea">多行</option>
              <option value="select">下拉</option>
              <option value="date">日期</option>
              <option value="sequence">序列</option>
            </select>
          </div>
          <div v-if="col.type === 'select'" class="field-row">
            <span class="field-label">选项</span>
            <input class="form-input-sm" v-model="col._opts" placeholder="逗号分隔" />
          </div>
          <div class="field-toggles">
            <div class="field-toggle">
              <span>可填</span>
              <div :class="['switch', { on: col.isEditable }]" @click="col.isEditable = !col.isEditable"></div>
            </div>
            <div class="field-toggle">
              <span>必填</span>
              <div :class="['switch', { on: col.required }]" @click="col.required = !col.required"></div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filterField" class="admin-cd" style="margin-top: 12px;">
        <div class="cd-title">👥 预提取填报成员</div>
        <div style="font-size: 12px; color: var(--tm); margin-bottom: 6px;">共 {{ extractedMembers.length }} 位成员</div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          <span v-for="m in extractedMembers" :key="m" class="tag tag-info">{{ m }}</span>
        </div>
      </div>

      <div style="display: flex; gap: 8px; margin-top: 16px;">
        <button class="btn btn-sm btn-ghost" @click="cancelImport">取消</button>
        <button class="btn btn-primary" style="flex: 1;" @click="onConfirmImport" :disabled="importing">
          {{ importing ? '导入中...' : '✓ 确认导入' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import * as XLSX from 'xlsx';
import { useDataStore } from '@/stores/useDataStore';
import { useToast } from '@/composables/useToast';
import type { Column, Template, FieldType } from '@/types';
import { useConfirm } from '@/composables/useConfirm';
import { MAX_FILE_SIZE } from '@/constants';

const emit = defineEmits<{ imported: [] }>();
const dataStore = useDataStore();
const { toastSuccess, toastWarning, toastError } = useToast();
const { confirmModal } = useConfirm();

const importType = ref('excel');
const importing = ref(false);
const excelInput = ref<HTMLInputElement | null>(null);
const jsonInput = ref<HTMLInputElement | null>(null);

interface PreviewCol extends Column {
  _opts?: string;
  sampleValues?: string[];
}

const previewData = ref<{ fileName: string; headers: string[]; rows: string[][] } | null>(null);
const columns = ref<PreviewCol[]>([]);
const filterField = ref('');
const titleFields = ref<string[]>([]);

const extractedMembers = computed(() => {
  if (!filterField.value || !previewData.value) return [];
  const colIdx = previewData.value.headers.indexOf(filterField.value);
  if (colIdx < 0) return [];
  const set = new Set<string>();
  previewData.value.rows.forEach(r => {
    const v = (r[colIdx] || '').trim();
    if (v) set.add(v);
  });
  return [...set];
});

function onImportTypeChange(idx: number, col: PreviewCol) {
  if (col.type === 'select' && !col._opts?.trim()) {
    if (previewData.value?.rows?.length) {
      const vals = previewData.value.rows.map(r => (r[idx] || '').trim()).filter(Boolean);
      const uniq = [...new Set(vals)];
      if (uniq.length) {
        col._opts = uniq.join(',');
        col.uniqueValues = [...uniq];
      }
    }
  }
}
function triggerExcel() { excelInput.value?.click(); }
function triggerJson() { jsonInput.value?.click(); }

function onExcelSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.[0]) parseExcel(input.files[0]);
}

function onExcelDrop(e: DragEvent) {
  if (e.dataTransfer?.files?.[0]) parseExcel(e.dataTransfer.files[0]);
}

function onJsonSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.[0]) parseJson(input.files[0]);
}

function onJsonDrop(e: DragEvent) {
  if (e.dataTransfer?.files?.[0]) parseJson(e.dataTransfer.files[0]);
}

function parseExcel(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!['xlsx', 'xls', 'csv'].includes(ext || '')) { toastWarning('不支持的格式'); return; }
  if (file.size > MAX_FILE_SIZE) { toastWarning('文件过大'); return; }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target?.result as ArrayBuffer), { type: 'array', cellDates: true, dateNF: 'yyyy-MM-dd' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false }) as unknown[][];
      if (!data || data.length < 2) throw new Error('数据不足');
      const rawHeaders = data[0].map((h, i) => String(h || '').trim() || ('列' + (i + 1)));
      // 列名查重：重复列名自动添加后缀
      const seen: Record<string, number> = {};
      const headers = rawHeaders.map(h => {
        if (!seen[h]) {
          seen[h] = 1;
          return h;
        }
        seen[h]++;
        return h + '_' + seen[h];
      });
      const rows = data.slice(1).map(r => headers.map((_, i) => {
        const v = r[i];
        if (v === null) return '';
        if (typeof v === 'object' && v instanceof Date) return v.toISOString().split('T')[0];
        return String(v).trim();
      }));
      previewData.value = { fileName: file.name, headers, rows };
      buildColumns(headers, rows);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '解析失败';
      toastError('解析失败: ' + msg);
    }
  };
  reader.readAsArrayBuffer(file);
}

function parseJson(file: File) {
  if (file.size > MAX_FILE_SIZE) { toastWarning('文件过大'); return; }
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const t = JSON.parse(e.target?.result as string);
      if (!t.columns || !Array.isArray(t.columns)) throw new Error('缺少 columns');
      if (!t.rows || !Array.isArray(t.rows)) throw new Error('缺少 rows');
      if (!t.id) t.id = 'tpl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      if (!t.filterField) t.filterField = '';
      if (!t.titleFields) t.titleFields = [];
      if (!t.rules) t.rules = [];
      t.columns.forEach((col: Column) => {
        if (col.isEditable === undefined) col.isEditable = true;
        if (col.required === undefined) col.required = false;
        if (col.included === undefined) col.included = true;
        if (!col.uniqueValues) col.uniqueValues = [];
        if (!col.type) col.type = 'text';
      });

      // 查重：模板名称
      const existByName = dataStore.tpls.find(tpl => tpl.name === t.name);
      if (existByName) {
        confirmModal(
          '已存在同名模板「' + t.name + '」（ID: ' + existByName.id + '）\n\n是否继续导入？',
          () => doJsonImport(t),
        );
        return;
      }

      // 查重：模板 ID
      const existById = dataStore.tpls.find(tpl => tpl.id === t.id);
      if (existById) {
        confirmModal(
          '已存在同ID模板「' + existById.name + '」（ID: ' + t.id + '）\n\n是否覆盖？',
          () => doJsonImport(t),
        );
        return;
      }

      await doJsonImport(t);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '导入失败';
      toastError('导入失败: ' + msg);
    }
  };
  reader.readAsText(file);
}

async function doJsonImport(t: Template & { members?: string[] }) {
  importing.value = true;
  try {
    await dataStore.createTemplate(t, 'json_import');
    dataStore.members[t.id] = t.members && Array.isArray(t.members) ? [...t.members] : [];
    if (dataStore.members[t.id].length) await dataStore.saveMembers(t.id);
    toastSuccess('✓ JSON导入成功: ' + t.name);
    emit('imported');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '导入失败';
    toastError('导入失败: ' + msg);
  } finally {
    importing.value = false;
  }
}

function buildColumns(headers: string[], rows: string[][]) {
  columns.value = headers.map((header, ci) => {
    const vals = rows.map(r => r[ci] || '').filter(v => v.trim());
    const uniq = [...new Set(vals)];
    let type: FieldType = 'text';
    if (uniq.length > 0 && uniq.every(v => /^-?\d+(\.\d+)?$/.test(v))) type = 'number';
    else if (uniq.length > 0 && uniq.every(v => /^\d{4}-\d{2}-\d{2}$/.test(v))) type = 'date';
    else if (uniq.length >= 2 && uniq.length <= 8 && rows.length >= 3) type = 'select';
    else if (uniq.some(v => v.length > 40)) type = 'textarea';
    const isEditable = /进展|结果|备注|状态|反馈|完成|说明|数量|金额|评价|评分|意见|计划|总结|数据|变更|更新|修改/i.test(header);
    return {
      id: 'c' + ci,
      header,
      type,
      required: /[*必|required]/i.test(header),
      isEditable,
      included: true,
      uniqueValues: type === 'select' ? uniq : [],
      _opts: type === 'select' ? uniq.join(',') : '',
      sampleValues: uniq.slice(0, 5),
    };
  });
}

function toggleTitle(header: string) {
  const idx = titleFields.value.indexOf(header);
  if (idx >= 0) titleFields.value.splice(idx, 1);
  else titleFields.value.push(header);
}

function cancelImport() {
  previewData.value = null;
  columns.value = [];
  filterField.value = '';
  titleFields.value = [];
}

async function onConfirmImport() {
  if (!previewData.value) return;

  const name = previewData.value.fileName.replace(/\.[^.]+$/, '');
  const id = 'tpl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

  // 查重：模板名称
  const existByName = dataStore.tpls.find(t => t.name === name);
  if (existByName) {
    confirmModal(
      '已存在同名模板「' + name + '」（ID: ' + existByName.id + '）\n\n是否继续导入？',
      () => doConfirmImport(id, name),
    );
    return;
  }

  doConfirmImport(id, name);
}

async function doConfirmImport(id: string, name: string) {
  importing.value = true;
  try {
    const cols: Column[] = columns.value.map((c, i) => ({
      id: 'c' + i,
      header: c.header,
      type: c.type,
      required: c.required,
      isEditable: c.isEditable,
      included: true,
      uniqueValues: c.type === 'select' ? (c._opts || '').split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    }));
    const rows = previewData.value!.rows.map((r, i) => {
      const obj: Record<string, string> = { _idx: String(i) };
      r.forEach((v, j) => { if (cols[j]) obj[cols[j].header] = v; });
      return obj;
    });
    const tpl: Template = { id, name, columns: cols, rows, filterField: filterField.value, titleFields: titleFields.value, rules: [] };
    await dataStore.createTemplate(tpl, 'excel_import');
    dataStore.members[id] = extractedMembers.value;
    if (extractedMembers.value.length) await dataStore.saveMembers(id);
    toastSuccess('✓ 导入成功: ' + name + (extractedMembers.value.length ? '（' + extractedMembers.value.length + '位成员已自动提取）' : ''));
    cancelImport();
    emit('imported');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '未知错误';
    toastError('导入失败: ' + msg);
  } finally {
    importing.value = false;
  }
}
</script>

<style scoped>
.admin-cd { background: var(--sf); border: 1px solid var(--b); border-radius: var(--rl); padding: 20px; margin-bottom: 16px; }
.cd-title { font-size: 14px; font-weight: 600; margin-bottom: 16px; color: var(--t); }
.import-tabs { display: flex; gap: 2px; margin-bottom: 16px; background: var(--bl); border-radius: var(--r); padding: 3px; }
.import-tab { flex: 1; padding: 9px 12px; border: none; background: none; font-size: 13px; font-family: inherit; cursor: pointer; border-radius: 4px; color: var(--tm); transition: all 0.15s; }
.import-tab.active { background: var(--sf); color: var(--p); font-weight: 500; }
.drop-zone { border: 2px dashed var(--border); border-radius: var(--rl); padding: 32px 20px; text-align: center; cursor: pointer; transition: all 0.2s; background: var(--bl); }
.drop-zone:hover { border-color: var(--p); background: var(--p3); }
.drop-icon { font-size: 40px; display: block; margin-bottom: 8px; opacity: 0.6; }
.drop-text { font-size: 14px; font-weight: 500; color: var(--ts); }
.drop-hint { font-size: 12px; color: var(--tm); margin-top: 4px; }
.preview-info { display: flex; align-items: center; gap: 10px; padding: 12px; background: var(--okl); border-radius: var(--r); margin-bottom: 12px; font-size: 13px; color: var(--ok); }
.table-wrap { overflow-x: auto; border: 1px solid var(--b); border-radius: var(--r); }
table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 300px; }
th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--b); }
th { background: var(--bl); font-weight: 600; font-size: 12px; }
.form-select { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--r); font-size: 13px; font-family: inherit; color: var(--t); background: var(--sf); background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; -webkit-appearance: none; appearance: none; outline: none; }
.form-select:focus { border-color: var(--p); }
.form-input-sm, .form-select-sm { flex: 1; padding: 5px 8px; border: 1px solid var(--border); border-radius: var(--r); font-size: 12px; font-family: inherit; color: var(--t); background: var(--sf); outline: none; }
.form-select-sm { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 6px center; padding-right: 24px; -webkit-appearance: none; appearance: none; }
.title-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.title-chip { padding: 6px 12px; border: 1px solid var(--b); border-radius: var(--r); font-size: 12px; cursor: pointer; background: var(--bl); transition: all 0.15s; }
.title-chip.on { background: var(--p3); border-color: var(--p); color: var(--p); font-weight: 500; }
.field-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.field-grid > * {
  flex: 1 1 280px;
  min-width: 0;
}
.field-card {
  background: var(--bl);
  border: 1px solid var(--b);
  border-radius: var(--r);
  padding: 12px;
  min-width: 0;
  box-sizing: border-box;
}
.field-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.field-num { width: 24px; height: 24px; border-radius: 50%; background: var(--pl); color: var(--p); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
.field-name { flex: 1; font-size: 13px; font-weight: 600; }
.field-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.field-label { font-size: 12px; color: var(--ts); min-width: 32px; flex-shrink: 0; }
.field-toggles { display: flex; gap: 16px; margin-top: 4px; }
.field-toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ts); }
.switch { width: 36px; height: 20px; border-radius: 10px; background: var(--border); cursor: pointer; position: relative; transition: background 0.2s; }
.switch::after { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: #fff; top: 2px; left: 2px; transition: transform 0.2s; }
.switch.on { background: var(--p); }
.switch.on::after { transform: translateX(16px); }
.tag { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 500; }
.tag-info { background: var(--pl); color: var(--p); }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 18px; border: 1px solid transparent; border-radius: var(--r); font-size: 14px; font-family: inherit; font-weight: 500; cursor: pointer; transition: all 0.15s; min-height: 40px; line-height: 1.3; background: none; outline: none; }
.btn-primary { background: var(--p); color: #fff; border-color: var(--p); }
.btn-ghost { background: transparent; color: var(--ts); border: 1px solid var(--b); }
.btn-sm { padding: 6px 14px; font-size: 12px; min-height: 32px; }
:host {
  padding-bottom: 70px;
}
</style>
