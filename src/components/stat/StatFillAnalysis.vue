<template>
  <div>
    <!-- 分析模式切换 -->
    <div class="analysis-tabs">
      <button
        :class="['analysis-tab', { active: mode === 'date' }]"
        @click="mode = 'date'"
      >📅 按日期</button>
      <button
        :class="['analysis-tab', { active: mode === 'member' }]"
        @click="mode = 'member'"
      >👤 按成员</button>
    </div>

    <!-- 按日期分析 -->
    <div v-if="mode === 'date'">
      <!-- 日期筛选 -->
      <div class="admin-cd" style="padding: 12px 16px;">
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <label class="filter-label">日期</label>
          <select class="filter-select" v-model="selDate">
            <option value="">全部日期</option>
            <option v-for="d in availableDates" :key="d" :value="d">{{ d }}</option>
          </select>
          <span class="filter-hint">共 {{ dateViewData.length }} 条记录</span>
        </div>
      </div>

      <!-- 日期视图数据 -->
      <div v-if="!dateViewData.length" class="admin-cd empty-hint">暂无填报数据</div>
      <div v-else class="admin-cd">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>填报人</th>
                <th>模板</th>
                <th>填报项</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in pagedDateViewData" :key="(currentPage - 1) * PAGE_SIZE + idx"
                :class="{ 'row-unfilled': row.completion === 0 }">
                <td style="font-weight: 500;">{{ row.date }}</td>
                <td>
                  <span class="user-tag">{{ row.user }}</span>
                </td>
                <td>{{ row.tplName }}</td>
                <td>{{ row.rowLabel }}</td>
                <td>
                  <span v-if="row.completion === 100" class="status-badge status-filled">已填报</span>
                  <span v-else class="status-badge status-unfilled">未填报</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 分页 -->
        <div class="pager" v-if="dateTotalPages > 1">
          <button class="btn btn-sm btn-ghost" :disabled="currentPage <= 1" @click="currentPage--">◀</button>
          <span>{{ currentPage }} / {{ dateTotalPages }}</span>
          <button class="btn btn-sm btn-ghost" :disabled="currentPage >= dateTotalPages" @click="currentPage++">▶</button>
          <span class="pager-info">每页 {{ PAGE_SIZE }} 条</span>
        </div>
      </div>

      <!-- 日期汇总 -->
      <div v-if="dateSummary.length" class="admin-cd">
        <div class="cd-title">📊 日期汇总</div>
        <div class="summary-grid">
          <div v-for="ds in dateSummary" :key="ds.date" class="summary-card">
            <div class="summary-date">{{ ds.date }}</div>
            <div class="summary-stats">
              <span class="summary-users">{{ ds.users }}人填报</span>
              <span class="summary-records">{{ ds.filled }}/{{ ds.total }}条已填</span>
              <span class="summary-rate" :style="{ color: getRateColor(ds.rate) }">{{ ds.rate }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 按成员分析 -->
    <div v-if="mode === 'member'">
      <!-- 成员筛选 -->
      <div class="admin-cd" style="padding: 12px 16px;">
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <label class="filter-label">成员</label>
          <select class="filter-select" v-model="selMember">
            <option value="">全部成员</option>
            <option v-for="m in availableMembers" :key="m" :value="m">{{ m }}</option>
          </select>
          <span class="filter-hint">共 {{ memberViewData.length }} 条记录</span>
        </div>
      </div>

      <!-- 成员视图数据 -->
      <div v-if="!memberViewData.length" class="admin-cd empty-hint">暂无填报数据</div>
      <div v-else class="admin-cd">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>填报人</th>
                <th>日期</th>
                <th>模板</th>
                <th>填报项</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in pagedMemberViewData" :key="(currentPage - 1) * PAGE_SIZE + idx"
                :class="{ 'row-unfilled': row.completion === 0 }">
                <td>
                  <span class="user-tag">{{ row.user }}</span>
                </td>
                <td style="font-weight: 500;">{{ row.date }}</td>
                <td>{{ row.tplName }}</td>
                <td>{{ row.rowLabel }}</td>
                <td>
                  <span v-if="row.completion === 100" class="status-badge status-filled">已填报</span>
                  <span v-else class="status-badge status-unfilled">未填报</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- 分页 -->
        <div class="pager" v-if="memberTotalPages > 1">
          <button class="btn btn-sm btn-ghost" :disabled="currentPage <= 1" @click="currentPage--">◀</button>
          <span>{{ currentPage }} / {{ memberTotalPages }}</span>
          <button class="btn btn-sm btn-ghost" :disabled="currentPage >= memberTotalPages" @click="currentPage++">▶</button>
          <span class="pager-info">每页 {{ PAGE_SIZE }} 条</span>
        </div>
      </div>

      <!-- 成员汇总 -->
      <div v-if="memberSummary.length" class="admin-cd">
        <div class="cd-title">👤 成员汇总</div>
        <div class="member-summary-list">
          <div v-for="ms in memberSummary" :key="ms.user" class="member-summary-item">
            <div class="member-summary-header">
              <span class="member-stat-avatar">{{ ms.user.charAt(0) }}</span>
              <span class="member-summary-name">{{ ms.user }}</span>
              <span class="member-summary-rate" :style="{ color: getRateColor(ms.rate) }">{{ ms.rate }}%</span>
            </div>
            <div class="tpl-stat-bar-bg">
              <div class="tpl-stat-bar-fill" :style="{ width: ms.rate + '%', background: getRateColor(ms.rate) }"></div>
            </div>
            <div class="tpl-stat-detail">
              {{ ms.filled }}/{{ ms.total }}条已填 · {{ ms.dates }}天 · {{ ms.tpls }}个模板
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useDataStore } from '@/stores/useDataStore';
import type { Template } from '@/types';

const props = defineProps<{ tplId: string }>();

const dataStore = useDataStore();

const mode = ref<'date' | 'member'>('date');
const selDate = ref('');
const selMember = ref('');
const currentPage = ref(1);
const PAGE_SIZE = 50;

// 筛选变化时重置页码
watch([selDate, selMember, mode], () => {
  currentPage.value = 1;
});

// 目标模板
const targetTpls = computed<Template[]>(() => {
  if (props.tplId) {
    const tpl = dataStore.tpls.find(t => t.id === props.tplId);
    return tpl ? [tpl] : [];
  }
  return dataStore.tpls;
});

// ===== 按日期分析 =====

interface FillRow {
  date: string;
  user: string;
  tplName: string;
  tplId: string;
  ri: string;
  rowLabel: string;
  filled: number;
  total: number;
  completion: number;
}

const allFillRows = computed<FillRow[]>(() => {
  const rows: FillRow[] = [];

  targetTpls.value.forEach(tpl => {
    const tplSub = dataStore.sub[tpl.id] || {};
    const members = dataStore.getTplMembers(tpl.id);
    const rowCount = tpl.rows ? tpl.rows.length : 0;

    if (!members.length || !rowCount) {
      // 无成员或无行时，只统计已有数据（按条目数计：每行=1条）
      Object.keys(tplSub).sort().reverse().forEach(date => {
        const daySub = tplSub[date] || {};
        Object.keys(daySub).forEach(user => {
          const ud = daySub[user];
          if (!ud) return;
          Object.keys(ud).forEach(ri => {
            const rd = ud[ri];
            if (!rd) return;
            if (!Object.values(rd).some(v => v && String(v).trim())) return;

            const baseRow = (tpl.rows && tpl.rows[parseInt(ri)]) ? tpl.rows[parseInt(ri)] : {};
            const tfs = tpl.titleFields || [];
            const rowLabel = tfs.length
              ? tfs.map(h => baseRow[h] || '').filter(v => v.trim()).join(' · ') || '第' + (parseInt(ri) + 1) + '项'
              : '第' + (parseInt(ri) + 1) + '项';

            rows.push({
              date, user, tplName: tpl.name, tplId: tpl.id, ri, rowLabel,
              filled: 1, total: 1, completion: 100,
            });
          });
        });
      });
      return;
    }

    // 有成员时：按条目数（每行=1条）统计已填报/未填报
    Object.keys(tplSub).sort().reverse().forEach(date => {
      const daySub = tplSub[date] || {};
      members.forEach(user => {
        const ud = daySub[user];

        for (let ri = 0; ri < rowCount; ri++) {
          const rd = ud ? ud[String(ri)] : null;
          const hasData = rd && Object.values(rd).some(v => v && String(v).trim());

          const baseRow = (tpl.rows && tpl.rows[ri]) ? tpl.rows[ri] : {};
          const tfs = tpl.titleFields || [];
          const rowLabel = tfs.length
            ? tfs.map(h => baseRow[h] || '').filter(v => v.trim()).join(' · ') || '第' + (ri + 1) + '项'
            : '第' + (ri + 1) + '项';

          rows.push({
            date, user, tplName: tpl.name, tplId: tpl.id, ri: String(ri), rowLabel,
            filled: hasData ? 1 : 0, total: 1, completion: hasData ? 100 : 0,
          });
        }
      });
    });
  });

  return rows;
});

const availableDates = computed(() => {
  const dates = new Set<string>();
  allFillRows.value.forEach(r => dates.add(r.date));
  return [...dates].sort().reverse();
});

const dateViewData = computed(() => {
  let rows = allFillRows.value;
  if (selDate.value) rows = rows.filter(r => r.date === selDate.value);
  return rows;
});

const pagedDateViewData = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return dateViewData.value.slice(start, start + PAGE_SIZE);
});

const dateTotalPages = computed(() =>
  Math.max(1, Math.ceil(dateViewData.value.length / PAGE_SIZE))
);

const dateSummary = computed(() => {
  const map: Record<string, { users: Set<string>; filled: number; total: number }> = {};

  dateViewData.value.forEach(r => {
    if (!map[r.date]) map[r.date] = { users: new Set(), filled: 0, total: 0 };
    map[r.date].users.add(r.user);
    if (r.filled) map[r.date].filled++;
    map[r.date].total++;
  });

  return Object.entries(map)
    .map(([date, data]) => ({
      date,
      users: data.users.size,
      filled: data.filled,
      total: data.total,
      rate: data.total > 0 ? Math.round((data.filled / data.total) * 100) : 0,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
});

// ===== 按成员分析 =====

const availableMembers = computed(() => {
  const members = new Set<string>();
  allFillRows.value.forEach(r => members.add(r.user));
  return [...members].sort();
});

const memberViewData = computed(() => {
  let rows = allFillRows.value;
  if (selMember.value) rows = rows.filter(r => r.user === selMember.value);
  return rows;
});

const pagedMemberViewData = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return memberViewData.value.slice(start, start + PAGE_SIZE);
});

const memberTotalPages = computed(() =>
  Math.max(1, Math.ceil(memberViewData.value.length / PAGE_SIZE))
);

const memberSummary = computed(() => {
  const map: Record<string, { filled: number; total: number; dates: Set<string>; tpls: Set<string> }> = {};

  memberViewData.value.forEach(r => {
    if (!map[r.user]) map[r.user] = { filled: 0, total: 0, dates: new Set(), tpls: new Set() };
    if (r.filled) map[r.user].filled++;
    map[r.user].total++;
    map[r.user].dates.add(r.date);
    map[r.user].tpls.add(r.tplId);
  });

  return Object.entries(map)
    .map(([user, data]) => ({
      user,
      filled: data.filled,
      total: data.total,
      dates: data.dates.size,
      tpls: data.tpls.size,
      rate: data.total > 0 ? Math.round((data.filled / data.total) * 100) : 0,
    }))
    .sort((a, b) => b.rate - a.rate);
});

// 工具函数
function getRateColor(rate: number): string {
  if (rate >= 90) return 'var(--ok)';
  if (rate >= 60) return 'var(--w)';
  if (rate >= 30) return 'var(--a)';
  return 'var(--d)';
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

.empty-hint {
  text-align: center;
  padding: 30px;
  color: var(--tm);
  font-size: 13px;
}

/* 分析模式切换 */
.analysis-tabs {
  display: flex;
  background: var(--bl);
  border: 1px solid var(--b);
  border-radius: var(--r);
  padding: 3px;
  margin-bottom: 16px;
  gap: 2px;
}

.analysis-tab {
  flex: 1;
  padding: 9px 12px;
  border: none;
  background: none;
  font-size: 13px;
  font-family: inherit;
  font-weight: 500;
  color: var(--tm);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
  text-align: center;
}

.analysis-tab.active {
  background: var(--sf);
  color: var(--p);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* 筛选 */
.filter-label {
  font-size: 13px;
  color: var(--ts);
  font-weight: 500;
  white-space: nowrap;
}

.filter-select {
  flex: 1;
  min-width: 120px;
  padding: 7px 12px;
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

.filter-select:focus {
  border-color: var(--p);
}

.filter-hint {
  font-size: 12px;
  color: var(--tm);
  white-space: nowrap;
}

/* 表格 */
.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--b);
  border-radius: var(--r);
  max-height: 500px;
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

.user-tag {
  display: inline-block;
  padding: 2px 8px;
  background: var(--pl);
  color: var(--p);
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;
}

/* 未填报行淡化 */
.row-unfilled td {
  color: var(--tm);
  opacity: 0.65;
}

/* 状态徽章 */
.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.status-filled {
  background: var(--okl);
  color: var(--ok);
}

.status-unfilled {
  background: var(--dl);
  color: var(--t);
}

/* 日期汇总 */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.summary-card {
  padding: 12px;
  background: var(--bl);
  border: 1px solid var(--b);
  border-radius: var(--r);
}

.summary-date {
  font-size: 13px;
  font-weight: 600;
  color: var(--t);
  margin-bottom: 6px;
}

.summary-stats {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
}

.summary-users {
  color: var(--ts);
}

.summary-records {
  color: var(--tm);
}

.summary-rate {
  font-weight: 700;
  margin-left: auto;
}

/* 成员汇总 */
.member-summary-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-summary-item {
  padding: 12px;
  background: var(--bl);
  border: 1px solid var(--b);
  border-radius: var(--r);
}

.member-summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.member-stat-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--pl);
  color: var(--p);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.member-summary-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--t);
}

.member-summary-rate {
  font-size: 16px;
  font-weight: 700;
}

.tpl-stat-bar-bg {
  height: 8px;
  background: var(--b);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
}

.tpl-stat-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.tpl-stat-detail {
  font-size: 11px;
  color: var(--tm);
}

/* 分页 */
.pager {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--b);
  font-size: 13px;
  color: var(--ts);
}

.pager-info {
  margin-left: auto;
  font-size: 12px;
  color: var(--tm);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid transparent;
  border-radius: var(--r);
  font-size: 12px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 32px;
  background: none;
  outline: none;
}

.btn-ghost {
  background: transparent;
  color: var(--ts);
  border: 1px solid var(--b);
}

.btn-ghost:hover:not(:disabled) {
  background: var(--bl);
}

.btn-ghost:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

:host {
  padding-bottom: 70px;
}
</style>
