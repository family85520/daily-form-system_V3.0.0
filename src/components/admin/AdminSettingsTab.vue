<template>
  <div class="settings-grid">
    <div class="admin-cd">
      <div class="cd-title">👥 成员管理</div>
      <div class="form-group">
        <label class="form-label">选择模板</label>
        <select class="form-select" v-model="selTplId" @change="onTplChange">
          <option value="">-- 请选择模板 --</option>
          <option v-for="t in dataStore.tpls" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </div>
      <p style="font-size: 13px; color: var(--ts); margin-bottom: 10px;">每行一个姓名（仅管理当前模板的填报人）</p>
      <textarea class="form-textarea" v-model="membersText" rows="8" :disabled="!selTplId"
        placeholder="选择上方模板后编辑成员列表"></textarea>
    </div>

    <div>
      <div class="admin-cd">
        <div class="cd-title">🔑 修改密码</div>
        <div class="form-group">
          <label class="form-label">当前密码</label>
          <input class="form-input" type="password" v-model="oldPwd" placeholder="请输入当前密码" />
        </div>
        <div class="form-group">
          <label class="form-label">新密码</label>
          <input class="form-input" type="password" v-model="newPwd" placeholder="请输入新密码" />
        </div>
      </div>

      <div class="admin-cd">
        <button class="btn btn-primary btn-block" @click="onSave">💾 保存设置</button>
        <div style="height: 8px;"></div>
        <button class="btn btn-block" style="color: var(--d); border-color: var(--d);" @click="onReset">🗑️ 清除所有数据</button>
      </div>
    </div>
  </div>

  <!-- 重置密码确认弹窗 -->
  <BaseModal
    :show="showResetModal"
    title="⚠️ 安全验证"
    max-width="400px"
    @close="showResetModal = false"
  >
    <div style="font-size: 13px; color: var(--ts); margin-bottom: 16px;">
      请输入管理员密码以确认清除所有数据
    </div>

    <div class="form-group">
      <label class="form-label">管理员密码</label>
      <input
        class="form-input"
        type="password"
        v-model="resetPwd"
        placeholder="请输入密码"
        @keyup.enter="onConfirmReset"
        autofocus
      />
    </div>

    <div style="font-size: 12px; color: var(--d); background: var(--dl); padding: 10px 12px; border-radius: var(--r); margin-top: 8px;">
      ⚠️ 此操作将清除所有模板、填报记录和成员数据，密码将重置为初始密码，此操作不可恢复！
    </div>

    <template #footer>
      <div class="btn-group">
        <button class="btn btn-default" @click="showResetModal = false">取消</button>
        <button class="btn btn-danger" @click="onConfirmReset">🗑️ 确认清除</button>
      </div>
    </template>
  </BaseModal>

  <InlineToast
    :show="showInlineToast"
    :message="inlineToastMsg"
    @close="showInlineToast = false"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDataStore } from '@/stores/useDataStore';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import BaseModal from '@/components/common/BaseModal.vue';
import InlineToast from '@/components/common/InlineToast.vue';

const authStore = useAuthStore();
const dataStore = useDataStore();
const { confirmDanger } = useConfirm();
const { toastSuccess, toastWarning, toastError } = useToast();

const selTplId = ref('');
const membersText = ref('');
const oldPwd = ref('');
const newPwd = ref('');

const showResetModal = ref(false);
const resetPwd = ref('');

const inlineToastMsg = ref('');
const showInlineToast = ref(false);

function showInlineToastFn(msg: string) {
  inlineToastMsg.value = msg;
  showInlineToast.value = true;
}

function onTplChange() {
  if (!selTplId.value) { membersText.value = ''; return; }
  membersText.value = dataStore.getTplMembers(selTplId.value).join('\n');
}

async function onSave() {
  if (selTplId.value) {
    const list = membersText.value.split('\n').map(s => s.trim()).filter(Boolean);
    dataStore.members[selTplId.value] = list;
    await dataStore.saveMembers(selTplId.value);
  }

  if (newPwd.value.trim()) {
    if (!oldPwd.value.trim()) { toastWarning('请输入当前密码'); return; }
    try {
      const res = await fetch('/api/password', {
        method: 'POST',
        headers: authStore.authHeaders,
        body: JSON.stringify({ oldPwd: oldPwd.value, newPwd: newPwd.value.trim() }),
      });
      const json = await res.json();
      if (json.success) { toastSuccess('✓ 密码已修改'); oldPwd.value = ''; newPwd.value = ''; }
      else { toastError(json.error || '修改失败'); }
    } catch (_err) { toastError('请求失败'); }
  } else {
    toastSuccess('✓ 设置已保存');
  }
}

function onReset() {
  confirmDanger('⚠️ 清除所有数据\n\n此操作将清除所有模板、填报记录和成员数据，密码将重置为初始密码', () => {
    resetPwd.value = '';
    showResetModal.value = true;
  });
}

async function onConfirmReset() {
  if (!resetPwd.value.trim()) {
    showInlineToastFn('⚠️ 请输入管理员密码');
    return;
  }

  try {
    const res = await fetch('/api/reset', {
      method: 'POST',
      headers: { ...authStore.authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: resetPwd.value }),
    });
    const json = await res.json();
    if (json.success) {
      showResetModal.value = false;
      await dataStore.loadData();
      authStore.logout();
      toastSuccess('✓ 已重置，密码已恢复为默认');
    } else {
      showInlineToastFn('⚠️ ' + (json.error || '密码错误'));
    }
  } catch (_err) {
    showInlineToastFn('⚠️ 请求失败，请重试');
  }
}
</script>

<style scoped>
.admin-cd { background: var(--sf); border: 1px solid var(--b); border-radius: var(--rl); padding: 20px; margin-bottom: 16px; }
.cd-title { font-size: 14px; font-weight: 600; margin-bottom: 16px; color: var(--t); }
.settings-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
@media (min-width: 768px) { .settings-grid { grid-template-columns: 1fr 1fr; } }
.form-group { margin-bottom: 12px; }
.form-label { font-size: 13px; color: var(--ts); font-weight: 500; display: block; margin-bottom: 4px; }
.form-input, .form-select, .form-textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--r); font-size: 13px; font-family: inherit; color: var(--t); background: var(--sf); outline: none; transition: border-color 0.15s; }
.form-input:focus, .form-select:focus, .form-textarea:focus { border-color: var(--p); }
.form-select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; -webkit-appearance: none; appearance: none; }
:host {
  padding-bottom: 70px;
}

.btn-group {
  display: flex;
  gap: 8px;
}

.btn-group .btn {
  flex: 1;
}
</style>
