<template>
  <div>
    <div class="admin-cd">
      <div class="cd-title">
        📝 审计日志
        <div style="margin-left: auto; display: flex; gap: 6px;">
          <button class="btn btn-sm btn-default" @click="loadLogs">🔄 刷新</button>
          <button class="btn btn-sm btn-default" style="color: var(--d);" @click="clearLogs">🗑️ 清空</button>
        </div>
      </div>

      <!-- 分类筛选 -->
      <div class="filter-row">
        <label class="filter-label">分类</label>
        <select class="form-select" v-model="filterCategory" @change="onCategoryChange">
          <option value="">全部分类</option>
          <option v-for="cat in filteredCategories" :key="cat" :value="cat">{{ getCategoryLabel(cat) }}</option>
        </select>

        <label class="filter-label">操作</label>
        <select class="form-select" v-model="filterAction" @change="onActionChange">
          <option value="">全部操作</option>
          <option v-for="act in filteredActions" :key="act" :value="act">{{ getActionLabel(act) }}</option>
        </select>
      </div>

      <!-- 统计摘要 -->
      <div class="audit-summary">
        <div v-for="(count, cat) in categoryStats" :key="cat" class="summary-item" @click="filterCategory = String(cat); loadLogs()">
          <span class="summary-icon">{{ getCategoryIcon(String(cat)) }}</span>
          <span class="summary-count">{{ count }}</span>
          <span class="summary-label">{{ getCategoryLabel(String(cat)) }}</span>
        </div>
      </div>

      <div v-if="!filteredLogs.length" style="text-align: center; padding: 30px; color: var(--tm);">
        暂无审计日志
      </div>

      <div v-else class="audit-list">
        <div v-for="(log, idx) in filteredLogs" :key="idx" :class="['audit-item', 'audit-' + log.category]">
          <div class="audit-time">{{ log.time }}</div>
          <div class="audit-action">
            <span :class="['tag', getCategoryTagClass(log.category)]">{{ getCategoryLabel(log.category) }}</span>
          </div>
          <div class="audit-type">
            <span :class="['tag', getActionTagClass(log.action)]">{{ getActionLabel(log.action) }}</span>
          </div>
          <div class="audit-detail">{{ log.detail }}</div>
          <div v-if="log.user" class="audit-user">{{ log.user }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/useAuthStore';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import { AUDIT_QUERY_LIMIT } from '@/constants';

const authStore = useAuthStore();
const { confirmModal } = useConfirm();
const { toastSuccess } = useToast();
const categoryActionsMap = ref<Record<string, string[]>>({});
const actionCategoriesMap = ref<Record<string, string[]>>({});

const filterCategory = ref('');
const filterAction = ref('');
const logs = ref<{ time: string; action: string; category: string; detail: string; user: string }[]>([]);
const categories = ref<string[]>([]);
const actions = ref<string[]>([]);

async function loadLogs() {
  try {
    let url = '/api/audit?limit=' + AUDIT_QUERY_LIMIT;
    if (filterCategory.value) url += '&category=' + encodeURIComponent(filterCategory.value);
    if (filterAction.value) url += '&action=' + encodeURIComponent(filterAction.value);

    const res = await fetch(url, {
      headers: authStore.authHeaders,
    });
    const json = await res.json();
    if (json.success) {
      logs.value = json.data.map((l: Record<string, string>) => ({
        time: l.time || l.created_at || '',
        action: l.action || '',
        category: l.category || 'system',
        detail: l.detail || '',
        user: l.user || '',
      }));
      if (json.categories) categories.value = json.categories;
      if (json.actions) actions.value = json.actions;
      if (json.categoryActions) categoryActionsMap.value = json.categoryActions;
      if (json.actionCategories) actionCategoriesMap.value = json.actionCategories;
    }
  } catch (_err) {
    // 静默处理
  }
}

// 分类变更时，重置操作筛选
function onCategoryChange() {
  filterAction.value = '';
  loadLogs();
}

// 操作变更时，重置分类筛选
function onActionChange() {
  filterCategory.value = '';
  loadLogs();
}

// 根据当前选中分类过滤可选操作
const filteredActions = computed(() => {
  if (!filterCategory.value) return actions.value;
  return categoryActionsMap.value[filterCategory.value] || [];
});

// 根据当前选中操作过滤可选分类
const filteredCategories = computed(() => {
  if (!filterAction.value) return categories.value;
  return actionCategoriesMap.value[filterAction.value] || [];
});

async function clearLogs() {
  confirmModal('确定清空所有审计日志？此操作不可恢复！', async () => {
    try {
      const res = await fetch('/api/audit', {
        method: 'DELETE',
        headers: authStore.authHeaders,
      });
      const json = await res.json();
      if (json.success) {
        toastSuccess('✓ 已清空审计日志');
        await loadLogs();
      }
    } catch (_err) {
      // 静默处理
    }
  });
}

const filteredLogs = computed(() => logs.value);

const categoryStats = computed(() => {
  const stats: Record<string, number> = {};
  logs.value.forEach(l => {
    const cat = l.category || 'system';
    stats[cat] = (stats[cat] || 0) + 1;
  });
  return stats;
});

function getCategoryLabel(cat: string): string {
  const map: Record<string, string> = {
    auth: '认证',
    data: '数据',
    template: '模板',
    member: '成员',
    system: '系统',
    error: '错误',
  };
  return map[cat] || cat;
}

function getCategoryIcon(cat: string): string {
  const map: Record<string, string> = {
    auth: '🔐',
    data: '📊',
    template: '📋',
    member: '👥',
    system: '⚙️',
    error: '❌',
  };
  return map[cat] || '📝';
}

function getCategoryTagClass(cat: string): string {
  const map: Record<string, string> = {
    auth: 'tag-info',
    data: 'tag-ok',
    template: 'tag-violet',
    member: 'tag-warn',
    system: 'tag-default',
    error: 'tag-error',
  };
  return map[cat] || 'tag-default';
}

function getActionLabel(action: string): string {
  const map: Record<string, string> = {
    login: '登录',
    login_fail: '登录失败',
    logout: '登出',
    password_change: '密码修改',
    submission_save: '保存填报',
    submission_delete: '删除填报',
    template_create: '创建模板',
    template_update: '更新模板',
    template_delete: '删除模板',
    member_save: '保存成员',
    data_save: '保存数据',
    data_delete: '删除数据',
    export: '导出数据',
    audit_clear: '清空日志',
    error: '业务错误',
  };
  return map[action] || action;
}

function getActionTagClass(action: string): string {
  if (action.includes('fail') || action.includes('error') || action.includes('delete')) return 'tag-error';
  if (action.includes('create') || action.includes('save')) return 'tag-ok';
  if (action.includes('update')) return 'tag-info';
  if (action.includes('login') || action.includes('logout')) return 'tag-violet';
  return 'tag-default';
}

onMounted(() => {
  loadLogs();
});
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 13px;
  color: var(--ts);
  font-weight: 500;
  min-width: 40px;
}

.form-select {
  flex: 1;
  min-width: 120px;
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

.form-select:focus {
  border-color: var(--p);
}

.audit-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bl);
  border: 1px solid var(--b);
  border-radius: var(--r);
  cursor: pointer;
  transition: all 0.15s;
  font-size: 13px;
}

.summary-item:hover {
  border-color: var(--p);
  background: var(--p3);
}

.summary-icon {
  font-size: 16px;
}

.summary-count {
  font-weight: 600;
  color: var(--p);
}

.summary-label {
  color: var(--ts);
}

.audit-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 600px;
  overflow-y: auto;
}

.audit-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bl);
  border: 1px solid var(--b);
  border-radius: var(--r);
  font-size: 13px;
  transition: border-color 0.15s;
}

.audit-item:hover {
  border-color: var(--p);
}

.audit-error {
  border-left: 3px solid var(--d);
}

.audit-auth {
  border-left: 3px solid var(--p);
}

.audit-data {
  border-left: 3px solid var(--ok);
}

.audit-template {
  border-left: 3px solid var(--violet);
}

.audit-member {
  border-left: 3px solid var(--w);
}

.audit-time {
  font-size: 11px;
  color: var(--tm);
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 130px;
}

.audit-action {
  flex-shrink: 0;
}

.audit-type {
  flex-shrink: 0;
}

.audit-detail {
  flex: 1;
  color: var(--ts);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audit-user {
  font-size: 11px;
  color: var(--tm);
  flex-shrink: 0;
  padding: 2px 8px;
  background: var(--bl);
  border-radius: 3px;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
}

.tag-info { background: var(--pl); color: var(--p); }
.tag-ok { background: var(--okl); color: var(--ok); }
.tag-warn { background: var(--wl); color: var(--w); }
.tag-error { background: var(--dl); color: var(--d); }
.tag-violet { background: var(--vl); color: var(--violet); }
.tag-default { background: var(--bl); color: var(--ts); }

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

.btn-default {
  background: var(--sf);
  color: var(--t);
  border-color: var(--border);
}

.btn-default:hover {
  background: var(--bl);
}

.btn-sm {
  padding: 6px 14px;
  font-size: 12px;
  min-height: 32px;
}

:host {
  padding-bottom: 70px;
}
</style>
