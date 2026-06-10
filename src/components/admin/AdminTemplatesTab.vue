<template>
  <div>
    <div style="display: flex; gap: 8px; margin-bottom: 16px;">
      <button class="btn btn-primary" style="flex: 1;" @click="onCreate">➕ 新建模板</button>
    </div>

    <div v-if="!dataStore.tpls.length" class="empty-state">
      <span class="empty-icon">📋</span>
      <p>暂无模板</p>
      <p style="font-size: 12px; margin-top: 8px;">请通过「导入」创建模板</p>
    </div>

    <div v-else class="tpl-list">
      <div v-for="tpl in dataStore.tpls" :key="tpl.id" class="tpl-card">
        <div class="tpl-card-header">
          <div class="tpl-card-icon">{{ (tpl.name || '?').charAt(0) }}</div>
          <div class="tpl-card-name">{{ tpl.name }}</div>
        </div>
        <div class="tpl-card-meta">
          {{ tpl.rows ? tpl.rows.length : 0 }} 行 ·
          {{ tpl.columns ? tpl.columns.filter(c => c.included && !c.isEditable).length : 0 }} 固定列 ·
          {{ tpl.columns ? tpl.columns.filter(c => c.included && c.isEditable).length : 0 }} 可填列 ·
          {{ dataStore.getTplMembers(tpl.id).length }} 位填报人
          <template v-if="tpl.filterField"> · 🔍{{ tpl.filterField }}</template>
        </div>
        <div class="tpl-card-actions">
          <button class="btn btn-sm btn-info" @click="$emit('edit-tpl', tpl.id)">🔧 编辑</button>
          <button class="btn btn-sm btn-default" @click="onExport(tpl)">📥 导出</button>
          <button class="btn btn-sm btn-default" style="color: var(--d);" @click="onDelete(tpl)">🗑️</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDataStore } from '@/stores/useDataStore';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import type { Template } from '@/types';

const emit = defineEmits<{
  'edit-tpl': [tplId: string];
  'create-tpl': [tplId: string];
}>();

const dataStore = useDataStore();
const { confirmModal } = useConfirm();
const { toastSuccess, toastError } = useToast();

async function onCreate() {
  const name = prompt('请输入模板名称', '新建模板');
  if (!name || !name.trim()) return;

  // 查重：模板名称
  const existByName = dataStore.tpls.find(t => t.name === name.trim());
  if (existByName) {
    confirmModal(
      '已存在同名模板「' + name.trim() + '」（ID: ' + existByName.id + '）\n\n是否继续创建？',
      () => doCreate(name.trim()),
    );
    return;
  }

  doCreate(name.trim());
}

function doCreate(name: string) {
  const id = 'tpl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const tpl: Template = {
    id,
    name,
    columns: [
      { id: 'c1', header: '项目名称', type: 'text', required: false, isEditable: false, included: true, uniqueValues: [] },
      { id: 'c2', header: '填报内容', type: 'text', required: true, isEditable: true, included: true, uniqueValues: [] },
    ],
    rows: [{ '项目名称': '示例项1', '填报内容': '', '_idx': '0' }],
    filterField: '',
    titleFields: ['项目名称'],
    rules: [],
  };

  dataStore.createTemplateLocal(tpl);
  if (!dataStore.members) dataStore.members = {};
  dataStore.members[id] = [];

  emit('create-tpl', id);
  toastSuccess('✓ 已创建: ' + name + '，请在编辑器中修改后保存');
}

function onExport(tpl: Template) {
  const exportData = {
    id: tpl.id,
    name: tpl.name,
    columns: tpl.columns,
    rows: tpl.rows,
    filterField: tpl.filterField || '',
    titleFields: tpl.titleFields || [],
    rules: tpl.rules || [],
    members: dataStore.getTplMembers(tpl.id) || [],
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (tpl.name || 'template') + '.json';
  a.click();

  // 记录导出审计日志
  fetch('/api/template/export-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tplId: tpl.id, tplName: tpl.name }),
  }).catch(() => {});
}

function onDelete(tpl: Template) {
  const tplSub = dataStore.sub[tpl.id] || {};
  let recordCount = 0;
  Object.values(tplSub).forEach(daySub => {
    Object.keys(daySub).forEach(user => {
      const ud = (daySub as Record<string, Record<string, Record<string, string>>>)[user];
      if (!ud) return;
      Object.keys(ud).forEach(ri => {
        if (ud[ri] && Object.values(ud[ri]).some(v => v && String(v).trim())) recordCount++;
      });
    });
  });

  const msg = '确定删除模板「' + tpl.name + '」？\n\n将删除：\n- ' +
    (tpl.rows ? tpl.rows.length : 0) + ' 行数据\n- ' +
    Object.keys(tplSub).length + ' 天填报记录\n- ' +
    recordCount + ' 条填报数据\n\n此操作不可恢复！';

  confirmModal(msg, async () => {
    try {
      await dataStore.deleteTemplate(tpl.id);
      toastSuccess('✓ 已删除');
    } catch (_err) {
      const msg = _err instanceof Error ? _err.message : '未知错误';
      toastError('删除失败: ' + msg);
    }
  });
}
</script>

<style scoped>
.empty-state { text-align: center; padding: 30px; color: var(--tm); }
.empty-icon { font-size: 48px; display: block; margin-bottom: 12px; opacity: 0.5; }
.tpl-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 70px;
}

.tpl-card {
  background: var(--sf);
  border: 1px solid var(--b);
  border-radius: var(--rl);
  padding: 16px;
}

.tpl-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }

.tpl-card-icon {
  width: 32px; height: 32px; border-radius: 8px;
  background: var(--pl); color: var(--p);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; flex-shrink: 0;
}

.tpl-card-name { font-size: 15px; font-weight: 600; }
.tpl-card-meta { font-size: 12px; color: var(--tm); margin-bottom: 10px; }
.tpl-card-actions { display: flex; gap: 6px; }
.tpl-card-actions .btn { flex: 1; }

.btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 6px; padding: 9px 18px; border: 1px solid transparent;
  border-radius: var(--r); font-size: 14px; font-family: inherit;
  font-weight: 500; cursor: pointer; transition: all 0.15s;
  min-height: 40px; line-height: 1.3; background: none; outline: none;
}

.btn-primary { background: var(--p); color: #fff; border-color: var(--p); }
.btn-default { background: var(--sf); color: var(--t); border-color: var(--border); }
.btn-default:hover { background: var(--bl); }
.btn-info { background: var(--a); color: #fff; border-color: var(--a); }
.btn-sm { padding: 6px 14px; font-size: 12px; min-height: 32px; }
</style>
