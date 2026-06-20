<template>
  <!-- 未验证 -->
  <div v-if="!authStore.isVerified" class="auth-page">
    <div class="auth-card">
      <div class="auth-icon">📊</div>
      <div class="auth-title">统计分析</div>
      <div class="auth-sub">需要管理员验证后才能查看</div>
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
    <div class="stat-header">
      <div class="stat-header-info">
        <span class="stat-title">📊 数据统计分析</span>
        <span class="stat-count">{{ dataStore.tpls.length }} 个模板 · {{ dataStore.totalRecords }} 条记录</span>
      </div>
      <button class="btn btn-sm btn-ghost" @click="onLogout">🚪 退出</button>
    </div>

    <!-- 模板选择 -->
    <div class="stat-filter-bar">
      <label class="filter-label">模板</label>
      <select class="filter-select" v-model="selTplId" @change="onTplChange">
        <option value="">全部模板</option>
        <option v-for="t in dataStore.tpls" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
    </div>

    <!-- Tab 切换 -->
    <div class="stat-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['stat-tab', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 内容区 -->
    <keep-alive>
      <component :is="currentComponent" :tpl-id="selTplId" />
    </keep-alive>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDataStore } from '@/stores/useDataStore';
import { useToast } from '@/composables/useToast';
import StatOverview from '@/components/stat/StatOverview.vue';
import StatFillAnalysis from '@/components/stat/StatFillAnalysis.vue';
import StatDataAnalysis from '@/components/stat/StatDataAnalysis.vue';
import CrossAnalysis from '@/components/stat/CrossAnalysis.vue';

const authStore = useAuthStore();
const dataStore = useDataStore();
const { toastSuccess } = useToast();

const password = ref('');
const errMsg = ref('');
const pwdInput = ref<HTMLInputElement | null>(null);
const activeTab = ref('overview');
const selTplId = ref('');

const tabs = [
  { key: 'overview', label: '📈 概览' },
  { key: 'fill', label: '📝 填报分析' },
  { key: 'data', label: '📊 数据分析' },
  { key: 'cross', label: '🔀 交叉分析' },
];

const componentMap: Record<string, typeof StatOverview> = {
  overview: StatOverview,
  fill: StatFillAnalysis,
  data: StatDataAnalysis,
  cross: CrossAnalysis,
};

const currentComponent = computed(() => componentMap[activeTab.value] || StatOverview);

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
  selTplId.value = '';
  activeTab.value = 'overview';
  toastSuccess('✓ 已退出');
}

function onTplChange() {
  // 切换模板时刷新
}

onMounted(() => {
  nextTick(() => pwdInput.value?.focus());
  if (authStore.isVerified) {
    dataStore.loadData().catch(() => {});
  }
});
</script>

<style scoped>
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
  margin-bottom: 4px;
}

.auth-sub {
  font-size: 13px;
  color: var(--tm);
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

.stat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.stat-header-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.stat-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--t);
  font-family: var(--font-display);
}

.stat-count {
  font-size: 12px;
  color: var(--tm);
  background: var(--card-bg);
  padding: 4px 12px;
  border-radius: var(--r-pill);
  border: 1px solid var(--b);
}

.stat-filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  background: var(--sf);
  border: 1px solid var(--b);
  border-radius: var(--rl);
  padding: 12px 16px;
  box-shadow: var(--shadow-sm);
}

.filter-label {
  font-size: 13px;
  color: var(--ts);
  font-weight: 500;
  white-space: nowrap;
}

.filter-select {
  flex: 1;
  padding: 8px 14px;
  border: 2px solid var(--border);
  border-radius: var(--r);
  font-size: 13px;
  font-family: var(--font-family);
  color: var(--t);
  background: var(--sf);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%235F8E8B' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
  -webkit-appearance: none;
  appearance: none;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.filter-select:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px rgba(38, 166, 154, 0.15);
}

.stat-tabs {
  display: flex;
  background: var(--bl);
  border: 1px solid var(--b);
  border-radius: var(--rl);
  padding: 4px;
  margin-bottom: 18px;
  gap: 2px;
  box-shadow: var(--shadow-sm);
}

.stat-tab {
  flex: 1;
  padding: 10px 14px;
  border: none;
  background: none;
  font-size: 13px;
  font-family: var(--font-family);
  font-weight: 500;
  color: var(--tm);
  cursor: pointer;
  border-radius: var(--r);
  transition: all 0.2s;
  white-space: nowrap;
  text-align: center;
}

.stat-tab:hover {
  color: var(--p);
  background: var(--p3);
}

.stat-tab.active {
  background: var(--sf);
  color: var(--p);
  box-shadow: var(--shadow-sm);
  font-weight: 600;
}

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

.btn-primary {
  background: var(--p);
  color: #fff;
  border-color: var(--p);
}

.btn-primary:hover {
  background: var(--p2);
}

.btn-ghost {
  background: transparent;
  color: var(--ts);
  border: 1px solid var(--b);
}

.btn-ghost:hover {
  background: var(--bl);
}

.btn-sm {
  padding: 6px 14px;
  font-size: 12px;
  min-height: 32px;
}

.btn-block {
  width: 100%;
}

:host {
  padding-bottom: 70px;
}
</style>
