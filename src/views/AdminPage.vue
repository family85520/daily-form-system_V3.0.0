<template>
  <!-- 未验证 -->
  <div v-if="!authStore.isVerified" class="auth-page">
    <div class="auth-card">
      <div class="auth-icon">🔒</div>
      <div class="auth-title">管理员验证</div>
      <input
        ref="pwdInput"
        type="password"
        class="auth-input"
        placeholder="••••"
        maxlength="20"
        v-model="password"
        @keyup.enter="onVerify"
        autofocus
      />
      <div v-if="errMsg" class="auth-error">{{ errMsg }}</div>
      <button class="btn btn-primary btn-block" @click="onVerify">验证</button>
    </div>
  </div>

  <!-- 已验证 -->
  <div v-else>
    <AdminTemplateEditor
      v-if="editingTid"
      :tpl-id="editingTid"
      :is-new="isNewTemplate"
      @back="editingTid = ''"
      @saved="onTplSaved"
    />
    <template v-else>
      <div class="page-header">
        <div>
          <h1 class="heading-section">⚙️ 系统管理</h1>
          <p class="text-body">{{ dataStore.tpls.length }} 个模板 · {{ dataStore.totalRecords }} 条记录 · {{ dataStore.allMembers.length }} 位成员</p>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="btn btn-sm btn-ghost logout-btn" @click="onLogout">🚪 退出</button>
        </div>
      </div>

      <div class="admin-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['admin-tab', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <AdminOverviewTab v-if="activeTab === 'overview'" @edit-tpl="startEdit" />
      <AdminTemplatesTab v-if="activeTab === 'templates'" @edit-tpl="onEditTpl" @create-tpl="onCreateTpl" />
      <AdminDataTab v-if="activeTab === 'data'" />
      <AdminImportTab v-if="activeTab === 'import'" @imported="onImported" />
      <AdminExportTab v-if="activeTab === 'export'" />
      <AdminAuditTab v-if="activeTab === 'audit'" />
      <AdminSettingsTab v-if="activeTab === 'settings'" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDataStore } from '@/stores/useDataStore';
import { useToast } from '@/composables/useToast';
import AdminOverviewTab from '@/components/admin/AdminOverviewTab.vue';
import AdminTemplatesTab from '@/components/admin/AdminTemplatesTab.vue';
import AdminTemplateEditor from '@/components/admin/AdminTemplateEditor.vue';
import AdminDataTab from '@/components/admin/AdminDataTab.vue';
import AdminImportTab from '@/components/admin/AdminImportTab.vue';
import AdminExportTab from '@/components/admin/AdminExportTab.vue';
import AdminSettingsTab from '@/components/admin/AdminSettingsTab.vue';
import AdminAuditTab from '@/components/admin/AdminAuditTab.vue';

const isNewTemplate = ref(false);
const authStore = useAuthStore();
const dataStore = useDataStore();
const { toastSuccess } = useToast();

const password = ref('');
const errMsg = ref('');
const pwdInput = ref<HTMLInputElement | null>(null);
const activeTab = ref('overview');
const editingTid = ref('');

const tabs = [
  { key: 'overview', label: '概览' },
  { key: 'templates', label: '模板' },
  { key: 'data', label: '数据' },
  { key: 'import', label: '导入' },
  { key: 'export', label: '导出' },
  { key: 'audit', label: '审计' },
  { key: 'settings', label: '设置' },
];

function onEditTpl(tplId: string) {
  isNewTemplate.value = false;
  editingTid.value = tplId;
}

function onCreateTpl(tplId: string) {
  isNewTemplate.value = true;
  editingTid.value = tplId;
}

async function onVerify() {
  errMsg.value = '';
  if (!password.value.trim()) {
    errMsg.value = '请输入密码';
    return;
  }
  const ok = await authStore.verify(password.value);
  if (ok) {
    toastSuccess('✓ 验证成功');
    password.value = '';
    try { await dataStore.loadData(); } catch (_e) {}
  } else {
    errMsg.value = '密码错误';
    password.value = '';
    nextTick(() => pwdInput.value?.focus());
  }
}

function onLogout() {
  authStore.logout();
  editingTid.value = '';
  activeTab.value = 'overview';
  toastSuccess('✓ 已退出');
}

function startEdit(tplId: string, isNew?: boolean) {
  editingTid.value = tplId;
  isNewTemplate.value = !!isNew;
}

function onTplSaved() {
  isNewTemplate.value = false;
  dataStore.loadData();
}

function onImported() {
  dataStore.loadData();
  activeTab.value = 'templates';
}

onMounted(() => {
  nextTick(() => pwdInput.value?.focus());
  if (authStore.isVerified) {
    dataStore.loadData().catch(() => {});
  }
});
</script>

<style scoped>
/* 页面标题 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.heading-section {
  font-size: 22px;
  font-weight: 700;
  color: var(--t);
  font-family: var(--font-display);
  margin-bottom: 4px;
}

.text-body {
  font-size: 13px;
  color: var(--tm);
}

.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.auth-card {
  background: var(--sf);
  border: 1px solid var(--b);
  border-radius: var(--rl);
  padding: 32px;
  text-align: center;
  width: 100%;
  max-width: 360px;
}

.auth-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.auth-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--t);
  margin-bottom: 16px;
}

.auth-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: var(--r);
  font-size: 18px;
  font-family: inherit;
  text-align: center;
  letter-spacing: 8px;
  outline: none;
  margin-bottom: 12px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.auth-input:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px var(--pl);
}

.auth-error {
  color: var(--d);
  font-size: 13px;
  margin-bottom: 12px;
}

.admin-stat-card {
  display: none;
}

.logout-btn {
  color: var(--d);
  border-color: var(--d);
  white-space: nowrap;
  flex-shrink: 0;
}

.logout-btn:hover {
  background: var(--dl);
}

.admin-tabs {
  display: flex;
  background: var(--bl);
  border: 1px solid var(--b);
  border-radius: var(--rl);
  padding: 4px;
  margin-bottom: 18px;
  overflow-x: auto;
  gap: 2px;
  box-shadow: var(--shadow-sm);
}

.admin-tab {
  flex: 1;
  min-width: 50px;
  padding: 10px 10px;
  border: none;
  background: none;
  font-size: 12px;
  font-family: var(--font-family);
  font-weight: 500;
  color: var(--tm);
  cursor: pointer;
  border-radius: var(--r);
  transition: all 0.2s;
  white-space: nowrap;
  text-align: center;
}

.admin-tab:hover {
  color: var(--p);
  background: var(--p3);
}

.admin-tab.active {
  background: var(--sf);
  color: var(--p);
  box-shadow: var(--shadow-sm);
  font-weight: 600;
}

@media (min-width: 768px) {
  .admin-tab {
    font-size: 13px;
    padding: 10px 12px;
    min-width: 70px;
  }
}

:host {
  padding-bottom: 70px;
}
</style>
