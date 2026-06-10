<template>
  <div>
    <div class="admin-cd">
      <div class="cd-title">📋 数据明细表</div>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <label class="filter-label">日期</label>
        <select class="filter-select" v-model="selDate">
          <option value="">全部</option>
          <option v-for="d in availableDates" :key="d" :value="d">{{ d }}</option>
        </select>

        <label class="filter-label">填报人</label>
        <select class="filter-select" v-model="selMember">
          <option value="">全部</option>
          <option v-for="m in availableMembers" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>

      <!-- 搜索 -->
      <div style="margin-bottom: 12px;">
        <input
          class="search-input"
          v-model="searchText"
          placeholder="🔍 搜索内容..."
        />
      </div>

      <!-- 统计摘要 -->
      <div class="detail-summary">
        <span>共 <strong>{{ detailRows.length }}</strong> 条记录</span>
        <span v-if="searchText">· 搜索「{{ searchText }}」</span>
      </div>
    </div>

    <!-- 无数据 -->
    <div v-if="!detailRows.length" class="admin-cd empty-hint">暂无数据</div>

    <!-- 数据表格 -->
    <div v-else class="admin-cd" style="padding: 0;">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>日期</th>
              <th>填报人</th>
              <th>模板</th>
              <th>行</th>
              <th v-for="col in displayCols" :key="col.key">{{ col.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in pagedRows" :key="idx">
              <td style="color: var(--tm); font-size: 11px;">{{ (currentPage - 1) * pageSize + idx + 1 }}</td>
              <td style="font-weight: 500; white-space: nowrap;">{{ row.date }}</td>
              <td>
                <span class="user-tag">{{ row.user }}</span>
              </td>
              <td>{{ row.tplName }}</td>
              <td>{{ row.rowLabel }}</td>
              <td v-for="col in displayCols" :key="col.key" :style="getCellHighlight(row.data[col.key], col)">
                {{ row.data[col.key] || '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="pager" v-if="detailRows.length > pageSize">
        <button class="btn btn-sm btn-ghost" :disabled="currentPage <= 1" @click="currentPage--">◀</button>
        <span>{{ currentPage }} / {{ totalPages }}</span>
        <button class="btn btn-sm btn-ghost" :disabled="currentPage >= totalPages" @click="currentPage++">▶</button>
        <span style="margin-left: auto; font-size: 12px; color: var(--tm);">每页 {{ pageSize }} 条</span>
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

const selDate = ref('');
const selMember = ref('');
const searchText = ref('');
const currentPage = ref(1);
const pageSize = 50;

// 目标模板
const targetTpls = computed<Template[]>(() => {
  if (props.tplId) {
    const tpl = dataStore.tpls.find(t => t.id === props.tplId);
    return tpl ? [tpl] : [];
  }
  return dataStore.tpls;
});

// 可用日期（联动成员筛选）
const availableDates = computed(() => {
  const dates = new Set<string>();
  targetTpls.value.forEach(tpl => {
    const tplSub = dataStore.sub[tpl.id] || {};
    Object.keys(tplSub).forEach(date => {
      if (selMember.value) {
        const daySub = tplSub[date] || {};
        if (daySub[selMember.value]) dates.add(date);
      } else {
        dates.add(date);
      }
    });
  });
  return [...dates].sort().reverse();
});

// 可用成员（联动日期筛选）
const availableMembers = computed(() => {
  const members = new Set<string>();
  targetTpls.value.forEach(tpl => {
    const tplSub = dataStore.sub[tpl.id] || {};
    const datesToCheck = selDate.value ? [selDate.value] : Object.keys(tplSub);
    datesToCheck.forEach(date => {
      const daySub = tplSub[date] || {};
      if (selMember.value) {
        if (daySub[selMember.value]) members.add(selMember.value);
      } else {
        Object.keys(daySub).forEach(u => members.add(u));
      }
    });
    // 同时包含模板成员列表
    dataStore.getTplMembers(tpl.id).forEach(m => {
      if (!selDate.value) {
        members.add(m);
      } else {
        const daySub = tplSub[selDate.value] || {};
        if (daySub[m]) members.add(m);
      }
    });
  });
  return [...members].sort();
});

// 显示列（合并所有模板的字段）
const displayCols = computed(() => {
  const cols: { key: string; label: string; type: string }[] = [];
  const seen = new Set<string>();
  targetTpls.value.forEach(tpl => {
    tpl.columns.filter(c => c.included).forEach(c => {
      if (!seen.has(c.header)) {
        seen.add(c.header);
        cols.push({ key: c.header, label: c.header, type: c.type });
      }
    });
  });
  return cols;
});

// 明细数据
interface DetailRow {
  date: string;
  user: string;
  tplName: string;
  tplId: string;
  ri: string;
  rowLabel: string;
  data: Record<string, string>;
}

const detailRows = computed<DetailRow[]>(() => {
  const rows: DetailRow[] = [];
  const search = searchText.value.trim().toLowerCase();

  targetTpls.value.forEach(tpl => {
    const tplSub = dataStore.sub[tpl.id] || {};

    Object.keys(tplSub).sort().reverse().forEach(date => {
      if (selDate.value && date !== selDate.value) return;

      const daySub = tplSub[date] || {};
      Object.keys(daySub).forEach(user => {
        if (selMember.value && user !== selMember.value) return;

        const ud = daySub[user];
        if (!ud) return;

        Object.keys(ud).forEach(ri => {
          const rd = ud[ri];
          if (!rd) return;
          if (!Object.values(rd).some(v => v && String(v).trim())) return;

          // 行标题
          const baseRow = (tpl.rows && tpl.rows[parseInt(ri)]) ? tpl.rows[parseInt(ri)] : {};
          const tfs = tpl.titleFields || [];
          const rowLabel = tfs.length
            ? tfs.map(h => baseRow[h] || '').filter(v => v.trim()).join(' · ') || '第' + (parseInt(ri) + 1) + '项'
            : '第' + (parseInt(ri) + 1) + '项';

          // 搜索过滤
          if (search) {
            const allVals = [
              date, user, tpl.name, rowLabel,
              ...Object.values(rd), ...Object.values(baseRow),
            ].map(v => String(v || '').toLowerCase());
            if (!allVals.some(v => v.includes(search))) return;
          }

          // 合并基础数据和填报数据
          const merged: Record<string, string> = {};
          displayCols.value.forEach(col => {
            const editable = tpl.columns.find(c => c.header === col.key)?.isEditable;
            merged[col.key] = editable ? (rd[col.key] || '') : (baseRow[col.key] || '');
          });

          rows.push({
            date,
            user,
            tplName: tpl.name,
            tplId: tpl.id,
            ri,
            rowLabel,
            data: merged,
          });
        });
      });
    });
  });

  return rows;
});

// 分页
const totalPages = computed(() => Math.max(1, Math.ceil(detailRows.value.length / pageSize)));

const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return detailRows.value.slice(start, start + pageSize);
});

// 搜索或筛选变化时重置页码
watch([searchText, selDate, selMember], () => {
  currentPage.value = 1;
});

// 日期变化时，如果当前成员不在可选列表中，清除成员筛选
watch(selDate, () => {
  if (selMember.value && !availableMembers.value.includes(selMember.value)) {
    selMember.value = '';
  }
});

// 成员变化时，如果当前日期不在可选列表中，清除日期筛选
watch(selMember, () => {
  if (selDate.value && !availableDates.value.includes(selDate.value)) {
    selDate.value = '';
  }
});

// 单元格高亮
function getCellHighlight(val: string, col: { type: string }): string {
  if (!val || !val.trim()) return 'color: var(--tm); font-style: italic;';
  if (col.type === 'number') {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      if (num > 0) return 'color: var(--ok); font-weight: 500;';
      if (num < 0) return 'color: var(--d); font-weight: 500;';
    }
  }
  return '';
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

.filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

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

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--r);
  font-size: 13px;
  font-family: inherit;
  color: var(--t);
  background: var(--sf);
  outline: none;
}

.search-input:focus {
  border-color: var(--p);
}

.detail-summary {
  font-size: 12px;
  color: var(--tm);
}

.detail-summary strong {
  color: var(--p);
}

/* 表格 */
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
  min-width: 600px;
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
  white-space: nowrap;
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
