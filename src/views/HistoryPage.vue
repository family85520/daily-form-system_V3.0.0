<template>
  <div class="history-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div>
        <h1 class="heading-section">📜 历史记录</h1>
        <p class="text-body">查看和筛选历史填报数据</p>
      </div>
    </div>

    <!-- 未选择模板 -->
    <div v-if="!activeTpl">
      <!-- 筛选区域（未选模板时显示） -->
      <div class="cd filter-bar">
        <div class="cd-title">🔍 筛选条件</div>
        <div class="filter-row">
          <label class="filter-label">填报日期</label>
          <div class="date-range">
            <input type="date" class="filter-input" v-model="dateFrom" />
            <span class="date-sep">至</span>
            <input type="date" class="filter-input" v-model="dateTo" />
          </div>
        </div>
        <div class="filter-row">
          <label class="filter-label">模板</label>
          <select class="filter-select" v-model="filterTplId">
            <option value="">全部模板</option>
            <option v-for="tpl in dataStore.tpls" :key="tpl.id" :value="tpl.id">
              {{ tpl.name }}
            </option>
          </select>
        </div>
        <div class="filter-row">
          <label class="filter-label">填报人</label>
          <select class="filter-select" v-model="filterUser">
            <option value="">全部填报人</option>
            <option v-for="u in filterAllUsers" :key="u" :value="u">{{ u }}</option>
          </select>
        </div>
        <div class="btn-group" style="margin-top: 12px;">
          <button class="btn btn-primary btn-sm" @click="applyFilter">🔍 查询</button>
          <button class="btn btn-default btn-sm" @click="resetFilter">重置</button>
        </div>
      </div>

      <!-- 统计区域 -->
      <div v-if="filterResults.length" class="stat-bar">
        <div class="stat-card stat-total">
          <div class="stat-num">{{ filterStats.totalRecords }}</div>
          <div class="stat-label">记录条数</div>
        </div>
        <div class="stat-card stat-filled">
          <div class="stat-num">{{ filterStats.totalDates }}</div>
          <div class="stat-label">涉及日期</div>
        </div>
        <div class="stat-card stat-unfilled">
          <div class="stat-num">{{ filterStats.totalUsers }}</div>
          <div class="stat-label">涉及填报人</div>
        </div>
        <div class="stat-card stat-template">
          <div class="stat-num">{{ filterStats.totalTpls }}</div>
          <div class="stat-label">涉及模板</div>
        </div>
      </div>

      <!-- 筛选结果 -->
      <div v-if="filterApplied && filterResults.length" class="hist-grid">
        <div v-for="item in filterResults" :key="item.id" class="cd">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 14px; font-weight: 600;">{{ formatDate(item.date) }}</span>
            <span class="tpl-badge">{{ item.tplName }}</span>
          </div>
          <div
            class="user-row"
            @click="goToHistory(item.tplId, item.user)"
          >
            <div class="user-avatar">{{ item.user.charAt(0) }}</div>
            <div style="flex: 1;">
              <div style="font-size: 13px; font-weight: 500;">{{ item.user }}</div>
              <div style="font-size: 11px; color: var(--tm);">
                已填 {{ item.filledCount }}/{{ item.rowCount }} 行
              </div>
            </div>
            <span class="tag tag-info">查看</span>
          </div>
        </div>
      </div>

      <!-- 无筛选结果 -->
      <div v-if="filterApplied && !filterResults.length" class="empty-state">
        <span class="empty-icon">📭</span>
        <p>暂无符合条件的记录</p>
      </div>

      <!-- 未筛选时显示模板卡片 -->
      <template v-if="!filterApplied">
        <div class="cd" style="padding: 14px 16px;">
          <div style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">
            📋 或选择模板查看详细历史
          </div>
          <div style="font-size: 12px; color: var(--tm);">
            共 {{ dataStore.tpls.length }} 个模板
          </div>
        </div>
        <div v-if="!dataStore.tpls.length" class="empty-state">
          <span class="empty-icon">📋</span>
          <p>暂无模板</p>
        </div>
        <div v-else class="tpl-grid">
          <div
            v-for="tpl in dataStore.tpls"
            :key="tpl.id"
            class="tpl-card"
            @click="selectTpl(tpl.id)"
          >
            <div class="tpl-card-icon">{{ (tpl.name || '?').charAt(0) }}</div>
            <div class="tpl-card-name">{{ tpl.name }}</div>
            <div class="tpl-card-meta">
              <span>📊 {{ tpl.rows ? tpl.rows.length : 0 }} 行</span>
              <span>👥 {{ getTplMembers(tpl.id).length }} 人</span>
            </div>
            <div class="tpl-card-enter">→</div>
          </div>
        </div>
      </template>
    </div>

    <!-- 已选模板，未选填报人 -->
    <template v-else-if="!currentFillUser">
      <div class="cd">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <button class="btn btn-ghost btn-sm" @click="backToTplList">← 返回</button>
          <span style="font-weight: 600;">{{ activeTpl.name }}</span>
        </div>
        <p style="font-size: 13px; color: var(--tm);">
          共{{ allDates.length }}天记录 · 该模板共{{ tplMembers.length }}位填报人
        </p>
      </div>

      <!-- 填报人选择 -->
      <div v-if="tplMembers.length" class="cd">
        <div class="cd-title">👤 选择填报人</div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          <button
            v-for="m in tplMembers"
            :key="m"
            :style="{
              background: getUserRecordCount(m) ? 'var(--a)' : 'var(--sf)',
              color: getUserRecordCount(m) ? '#fff' : 'var(--t)',
              border: getUserRecordCount(m) ? 'none' : '2px solid var(--p)',
              borderRadius: '9999px',
              padding: '6px 14px',
              fontSize: '12px',
              fontFamily: 'inherit',
              fontWeight: getUserRecordCount(m) ? '600' : '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              minWidth: '80px',
              textAlign: 'center',
              outline: 'none',
              boxShadow: getUserRecordCount(m) ? 'var(--shadow-sm)' : 'none'
            }"
            @click="selectUser(m)"
          >
            {{ m }}{{ getUserRecordCount(m) ? ' (' + getUserRecordCount(m) + '天)' : '' }}
          </button>
        </div>
      </div>

      <!-- 无记录 -->
      <div v-if="!allDates.length" class="empty-state">
        <span class="empty-icon">📭</span>
        <p>暂无记录</p>
      </div>

      <!-- 日期网格 -->
      <div v-else class="hist-grid">
        <div v-for="date in allDates" :key="date" class="cd">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 14px; font-weight: 600;">{{ formatDate(date) }}</span>
            <span style="font-size: 12px; color: var(--tm);">
              {{ Object.keys(tplSub[date] || {}).length }}人填报
            </span>
          </div>
          <div
            v-for="u in Object.keys(tplSub[date] || {})"
            :key="u"
            class="user-row"
            @click="selectUser(u)"
          >
            <div class="user-avatar">{{ u.charAt(0) }}</div>
            <div style="flex: 1;">
              <div style="font-size: 13px; font-weight: 500;">{{ u }}</div>
              <div style="font-size: 11px; color: var(--tm);">
                已填 {{ getFilledCount(date, u) }}/{{ getRowCount(u) }} 行
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 已选模板 + 已选填报人 -->
    <template v-else>
      <div class="cd">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <button class="btn btn-ghost btn-sm" @click="backToUserList">← 返回列表</button>
          <span style="font-weight: 600;">{{ activeTpl.name }}</span>
        </div>
        <p style="font-size: 13px; color: var(--tm);">
          用户: <strong style="color: var(--p);">{{ currentFillUser }}</strong> · {{ myDates.length }}天记录
        </p>
      </div>

      <!-- 无记录 -->
      <div v-if="!myDates.length" class="empty-state">
        <span class="empty-icon">📭</span>
        <p>暂无记录</p>
      </div>

      <!-- 该人的历史记录 -->
      <div v-else class="hist-grid">
        <div v-for="date in myDates" :key="date" class="cd">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 14px; font-weight: 600;">{{ formatDate(date) }}</span>
            <a
              :href="'/api/export/excel?tplId=' + activeTplId + '&date=' + date + '&user=' + encodeURIComponent(currentFillUser)"
              class="btn btn-info btn-sm"
              style="text-decoration: none;"
              target="_blank"
            >导出</a>
          </div>
          <div
            class="user-row"
            @click="viewRecord(activeTplId, date, currentFillUser)"
          >
            <div class="user-avatar">{{ currentFillUser.charAt(0) }}</div>
            <div style="flex: 1;">
              <div style="font-size: 13px; font-weight: 500;">{{ currentFillUser }}</div>
              <div style="font-size: 11px; color: var(--tm);">
                已填 {{ getFilledCount(date, currentFillUser) }}/{{ getRowCount(currentFillUser) }} 行
              </div>
            </div>
            <span class="tag tag-info">查看</span>
          </div>
        </div>
      </div>

      <!-- 导出全部数据 -->
      <div class="cd" style="margin-top: 16px;">
        <a
          :href="'/api/export/csv?tplId=' + activeTplId + '&user=' + encodeURIComponent(currentFillUser)"
          class="btn btn-primary btn-block"
          style="text-decoration: none; margin-bottom: 8px;"
          target="_blank"
        >导出全部数据 (CSV)</a>
        <a
          :href="'/api/export/excel?tplId=' + activeTplId + '&user=' + encodeURIComponent(currentFillUser)"
          class="btn btn-info btn-block"
          style="text-decoration: none;"
          target="_blank"
        >导出全部数据 (Excel)</a>
      </div>
    </template>

    <!-- 查看记录弹窗 -->
    <BaseModal
      :show="showRecord"
      :title="recordTitle"
      max-width="560px"
      @close="showRecord = false"
    >
      <div v-if="!recordRows.length" style="text-align: center; padding: 20px; color: var(--tm);">
        暂无数据
      </div>
      <template v-else>
        <div style="font-size: 12px; color: var(--tm); margin-bottom: 12px; text-align: center;">
          共填报 {{ recordRows.length }} 行
        </div>
        <div
          v-for="(item, idx) in recordRows"
          :key="idx"
          class="record-row"
        >
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="font-size: 14px; font-weight: 600;">{{ item.title }}</div>
            <button class="btn btn-sm btn-info" @click="inheritSingleRow(item.rowIndex)">📥 继承此条</button>
          </div>
          <div
            v-for="field in item.fields"
            :key="field.label"
            style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;"
          >
            <span style="color: var(--ts);">{{ field.label }}</span>
            <span style="font-weight: 500; max-width: 60%; text-align: right; word-break: break-all;">
              {{ field.value }}
            </span>
          </div>
        </div>
      </template>
      <template #footer>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-default" style="flex: 1;" @click="showRecord = false">关闭</button>
          <button class="btn btn-primary" style="flex: 1;" @click="inheritAll">📥 全部继承到今日</button>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDataStore } from '@/stores/useDataStore';
import type { Template } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';
import { useToast } from '@/composables/useToast';

const dataStore = useDataStore();
const { toastSuccess, toastWarning } = useToast();

// ===== 筛选状态 =====
const filterTplId = ref('');
const filterUser = ref('');
const filterApplied = ref(false);
const filterResults = ref<{
  id: string;
  tplId: string;
  tplName: string;
  date: string;
  user: string;
  filledCount: number;
  rowCount: number;
}[]>([]);

// 默认日期范围（最近7天）
const dateFrom = ref(getDateOffset(-7));
const dateTo = ref(getDateOffset(0));

// ===== 查看记录弹窗状态 =====
const showRecord = ref(false);
const recordTitle = ref('');
const recordRows = ref<{ rowIndex: string; title: string; fields: { label: string; value: string }[] }[]>([]);
const recordDate = ref('');

// ===== 计算属性 =====
const activeTplId = computed(() => dataStore.activeTemplateId);
const activeTpl = computed(() => dataStore.activeTemplate);
const currentFillUser = computed(() => dataStore.currentFillUser);

const tplSub = computed(() => {
  if (!activeTplId.value) return {};
  return dataStore.sub[activeTplId.value] || {};
});

const tplMembers = computed(() => getTplMembers(activeTplId.value));

const allDates = computed(() => Object.keys(tplSub.value).sort().reverse());

const myDates = computed(() => {
  if (!currentFillUser.value) return [];
  return allDates.value.filter(date => {
    const daySub = tplSub.value[date] || {};
    return daySub[currentFillUser.value];
  });
});

// 筛选区域的填报人列表（根据筛选的模板）
const filterAllUsers = computed(() => {
  const users: Record<string, boolean> = {};
  const sub = dataStore.sub;

  Object.keys(sub).forEach(tplId => {
    if (filterTplId.value && tplId !== filterTplId.value) return;
    const tplSub = sub[tplId] || {};
    Object.keys(tplSub).forEach(date => {
      if (dateFrom.value && date < dateFrom.value) return;
      if (dateTo.value && date > dateTo.value) return;
      const daySub = tplSub[date] || {};
      Object.keys(daySub).forEach(user => {
        if (user) users[user] = true;
      });
    });
  });

  return Object.keys(users).sort();
});

// 筛选统计
const filterStats = computed(() => {
  const dates: Record<string, boolean> = {};
  const users: Record<string, boolean> = {};
  const tpls: Record<string, boolean> = {};
  let totalRecords = 0;

  filterResults.value.forEach(item => {
    dates[item.date] = true;
    users[item.user] = true;
    tpls[item.tplId] = true;
    totalRecords++;
  });

  return {
    totalRecords,
    totalDates: Object.keys(dates).length,
    totalUsers: Object.keys(users).length,
    totalTpls: Object.keys(tpls).length,
  };
});

// ===== 工具函数 =====
function getDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function getTplMembers(tplId: string): string[] {
  return dataStore.getTplMembers(tplId);
}

function getUserRecordCount(user: string): number {
  return allDates.value.filter(date => {
    const daySub = tplSub.value[date] || {};
    return daySub[user];
  }).length;
}

function getFilledCount(date: string, user: string): number {
  const ud = ((tplSub.value[date] || {})[user]) || {};
  return Object.keys(ud).filter(ri => {
    const rd = ud[ri];
    return rd && typeof rd === 'object' && Object.values(rd).some(v => v && String(v).trim());
  }).length;
}

function getRowCount(user: string): number {
  const tpl = activeTpl.value;
  if (!tpl || !tpl.rows) return 0;
  const ff = tpl.filterField;
  const eCols = tpl.columns.filter(c => c.isEditable && c.included);
  if (ff && tpl.columns.find(c => c.header === ff && c.included)) {
    return tpl.rows.filter(r => (r[ff] || '').trim() === user.trim()).length;
  }
  return eCols.length > 0 ? tpl.rows.length : 0;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  return (d.getMonth() + 1) + '月' + d.getDate() + '日 星期' + weekDays[d.getDay()];
}

function getRowTitle(tpl: Template, row: Record<string, string>): string {
  const tfs = tpl.titleFields || [];
  if (!tfs.length) return '';
  return tfs.map(h => row[h] || '').filter(v => v.trim()).join(' · ') || '';
}

// ===== 筛选操作 =====
function applyFilter() {
  const results: typeof filterResults.value = [];
  const sub = dataStore.sub;

  Object.keys(sub).forEach(tplId => {
    if (filterTplId.value && tplId !== filterTplId.value) return;

    const tpl = dataStore.tpls.find(t => t.id === tplId);
    if (!tpl) return;

    const tplSub = sub[tplId] || {};
    const ff = tpl.filterField;
    const eCols = tpl.columns.filter(c => c.isEditable && c.included);

    Object.keys(tplSub).forEach(date => {
      if (dateFrom.value && date < dateFrom.value) return;
      if (dateTo.value && date > dateTo.value) return;

      const daySub = tplSub[date] || {};
      Object.keys(daySub).forEach(user => {
        if (filterUser.value && user !== filterUser.value) return;

        const userData = daySub[user] || {};
        const hasData = Object.keys(userData).some(ri => {
          const rd = userData[ri];
          return rd && typeof rd === 'object' && Object.values(rd).some(v => v && String(v).trim());
        });
        if (!hasData) return;

        // 计算行数
        let rowCount = 0;
        if (tpl.rows) {
          if (ff && tpl.columns.find(c => c.header === ff && c.included)) {
            rowCount = tpl.rows.filter(r => (r[ff] || '').trim() === user.trim()).length;
          } else {
            rowCount = eCols.length > 0 ? tpl.rows.length : 0;
          }
        }

        const filledCount = Object.keys(userData).filter(ri => {
          const rd = userData[ri];
          return rd && typeof rd === 'object' && Object.values(rd).some(v => v && String(v).trim());
        }).length;

        results.push({
          id: tplId + '_' + date + '_' + user,
          tplId,
          tplName: tpl.name || '未知模板',
          date,
          user,
          filledCount,
          rowCount,
        });
      });
    });
  });

  // 按日期降序
  results.sort((a, b) => b.date.localeCompare(a.date));

  filterResults.value = results;
  filterApplied.value = true;
}

function resetFilter() {
  filterTplId.value = '';
  filterUser.value = '';
  dateFrom.value = getDateOffset(-7);
  dateTo.value = getDateOffset(0);
  filterApplied.value = false;
  filterResults.value = [];
}

function goToHistory(tplId: string, user: string) {
  dataStore.setActiveTemplate(tplId);
  dataStore.setCurrentFillUser(user);
}

// ===== 导航操作 =====
function selectTpl(tplId: string) {
  dataStore.setActiveTemplate(tplId);
  dataStore.setCurrentFillUser('');
}

function selectUser(user: string) {
  dataStore.setCurrentFillUser(user);
}

function backToTplList() {
  dataStore.setActiveTemplate('');
  dataStore.setCurrentFillUser('');
  filterApplied.value = false;
}

function backToUserList() {
  dataStore.setCurrentFillUser('');
}

function viewRecord(tplId: string, date: string, user: string) {
  const tpl = dataStore.tpls.find(t => t.id === tplId);
  const ud = ((dataStore.sub[tplId] || {})[date] || {})[user];
  if (!tpl || !ud) return;

  const eCols = tpl.columns.filter(c => c.isEditable && c.included);
  const rows: { rowIndex: string; title: string; fields: { label: string; value: string }[] }[] = [];

  if (tpl.rows) {
    tpl.rows.forEach((row, ri) => {
      const rd = ud[ri];
      if (!rd) return;
      const hasVal = Object.values(rd).some(v => v && String(v).trim());
      if (!hasVal) return;

      const title = getRowTitle(tpl, row) || '第' + (ri + 1) + '项';
      const fields: { label: string; value: string }[] = [];

      eCols.forEach(c => {
        const val = rd[c.header];
        if (!val) return;
        fields.push({ label: c.header, value: val });
      });

      rows.push({ rowIndex: String(ri), title, fields });
    });
  }
  recordDate.value = date;
  recordTitle.value = user + ' — ' + formatDate(date);
  recordRows.value = rows;
  showRecord.value = true;
}

async function inheritAll() {
  try {
    if (!activeTplId.value || !currentFillUser.value || !recordRows.value.length) return;

    const today = new Date();
    const cd = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');

    const tpl = dataStore.tpls.find(t => t.id === activeTplId.value);
    if (!tpl) return;

    const copied: Record<string, Record<string, string>> = {};
    const ud = ((dataStore.sub[activeTplId.value] || {})[recordDate.value] || {})[currentFillUser.value] || {};

    Object.keys(ud).forEach(ri => {
      const rd = ud[ri];
      if (rd && typeof rd === 'object' && Object.values(rd).some(v => v && String(v).trim())) {
        copied[ri] = { ...rd };
      }
    });

    if (!Object.keys(copied).length) return;

    await dataStore.saveSubmission(activeTplId.value, cd, currentFillUser.value, copied);
    toastSuccess('✓ 已继承 ' + Object.keys(copied).length + ' 行数据到今日');
    showRecord.value = false;
  } catch (_err) {
    console.error('继承全部数据失败:', _err);
    toastWarning('继承失败，请重试');
  }
}

async function inheritSingleRow(rowIndex: string) {
  try {
    if (!activeTplId.value || !currentFillUser.value) return;

    const today = new Date();
    const cd = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');

    const ud = ((dataStore.sub[activeTplId.value] || {})[recordDate.value] || {})[currentFillUser.value] || {};
    const rd = ud[rowIndex];
    if (!rd) return;

    await dataStore.saveSubmission(activeTplId.value, cd, currentFillUser.value, { [rowIndex]: { ...rd } });
    toastSuccess('✓ 已继承该行数据到今日');
  } catch (_err) {
    console.error('继承单行数据失败:', _err);
    toastWarning('继承失败，请重试');
  }
}
</script>

<style scoped>
.history-page {
  padding-bottom: 20px;
}

/* ===== 筛选区域 ===== */
.filter-bar {
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.filter-label {
  font-size: 13px;
  color: var(--ts);
  font-weight: 500;
  min-width: 56px;
  flex-shrink: 0;
}

.filter-select {
  flex: 1;
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
  transition: border-color 0.15s;
}

.filter-select:focus {
  border-color: var(--p);
}

.date-range {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--r);
  font-size: 13px;
  font-family: inherit;
  color: var(--t);
  background: var(--sf);
  outline: none;
  transition: border-color 0.15s;
}

.filter-input:focus {
  border-color: var(--p);
}

.date-sep {
  font-size: 12px;
  color: var(--tm);
  flex-shrink: 0;
}

/* ===== 统计区域 ===== */
.stat-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  flex: 1;
  min-width: 0;
  background: var(--sf);
  border: 2px solid var(--b);
  border-radius: var(--rl);
  padding: 14px;
  text-align: center;
}

.stat-total .stat-num { color: var(--p); }
.stat-total { border-color: var(--p); }

.stat-filled .stat-num { color: var(--ok); }
.stat-filled { border-color: var(--ok); }

.stat-unfilled .stat-num { color: var(--d); }
.stat-unfilled { border-color: var(--d); }

.stat-template .stat-num { color: var(--violet); }
.stat-template { border-color: var(--violet); }

.stat-num {
  font-size: 22px;
  font-weight: 700;
}

.stat-label {
  font-size: 11px;
  color: var(--tm);
  margin-top: 2px;
  font-weight: 500;
}

/* ===== 通用 ===== */
.cd {
  background: var(--sf);
  border: 1px solid var(--b);
  border-radius: var(--rl);
  padding: 16px;
  margin-bottom: 12px;
}

.cd-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--t);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--tm);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  display: block;
  opacity: 0.5;
}

.tpl-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (min-width: 768px) {
  .tpl-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.tpl-card {
  background: var(--sf);
  border: 1px solid var(--b);
  border-radius: var(--rl);
  padding: 20px;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  overflow: hidden;
}

.tpl-card:hover {
  border-color: var(--p);
  box-shadow: var(--shadow);
  transform: translateY(-1px);
}

.tpl-card-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--pl);
  color: var(--p);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 12px;
}

.tpl-card-name {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tpl-card-meta {
  font-size: 12px;
  color: var(--tm);
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.tpl-card-enter {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
  color: var(--tm);
  opacity: 0;
  transition: opacity 0.15s;
}

.tpl-card:hover .tpl-card-enter {
  opacity: 1;
}

.hist-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (min-width: 768px) {
  .hist-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.user-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-top: 1px solid var(--b);
  cursor: pointer;
  transition: background 0.1s;
}

.user-row:hover {
  background: var(--bl);
  margin: 0 -16px;
  padding-left: 16px;
  padding-right: 16px;
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--pl);
  color: var(--p);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.tpl-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
  background: var(--pl);
  color: var(--p);
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
}

.tag-info {
  background: var(--pl);
  color: var(--p);
}

/* ===== 按钮样式 ===== */
.record-row {
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--b);
}

.record-row:last-child {
  border-bottom: none;
}
</style>
