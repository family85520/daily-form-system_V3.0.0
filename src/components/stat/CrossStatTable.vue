<template>
  <div>
    <!-- 无数据 -->
    <div v-if="!crossData.rows.length" class="admin-cd empty-hint">
      当前配置下无数据
    </div>

    <!-- 交叉表 -->
    <div v-else class="admin-cd" style="padding: 0;">
      <div class="cd-title" style="padding: 16px 20px 0;">🔀 交叉分析结果</div>

      <div class="table-info">
        <span>行维度: {{ config.rowDims.join(' × ') || '无' }}</span>
        <span>列维度: {{ config.colDims.join(' × ') || '无' }}</span>
        <span>指标: {{ metricLabels }}</span>
      </div>

      <div class="table-wrap">
        <table class="cross-table">
          <thead>
            <!-- 列维度表头 -->
            <tr v-for="(headerRow, hi) in crossData.headerRows" :key="hi">
              <!-- 行维度列头 -->
              <th v-if="hi === 0" :rowspan="crossData.headerRows.length" class="corner-cell">
                {{ config.rowDims.join(' \\ ') }}
              </th>
              <th v-for="(h, idx) in headerRow" :key="idx" class="col-header"
                :colspan="h.colspan || 1"
                :class="{ 'col-total': h.isTotal }">
                {{ h.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, ri) in crossData.rows" :key="ri"
              :class="{ 'row-total': row.isTotal, 'row-subtotal': row.isSubtotal }">
              <td class="row-header" :class="{ 'row-total-header': row.isTotal, 'row-subtotal-header': row.isSubtotal }">
                {{ row.label }}
              </td>
              <td v-for="(cell, ci) in row.cells" :key="ci"
                class="data-cell"
                :class="{ 'cell-total': row.isTotal || cell.isTotal, 'cell-empty': cell.value === '-' }">
                {{ cell.value }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDataStore } from '@/stores/useDataStore';
import type { Template } from '@/types';
import type { CrossStatConfigData } from '@/components/stat/CrossAnalysis.vue';

const props = defineProps<{
  config: CrossStatConfigData;
  tplId: string;
}>();

const metricLabels = computed<string>(() => {
  return props.config.metrics
    .map((m: Metric) => getFuncLabel(m.func) + (m.field ? '(' + m.field + ')' : ''))
    .join(', ');
});

const dataStore = useDataStore();

const currentTpl = computed<Template | null>(() => {
  if (!props.tplId) return null;
  return dataStore.tpls.find(t => t.id === props.tplId) || null;
});

interface HeaderCell {
  label: string;
  colspan: number;
  isTotal?: boolean;
}

interface DataCell {
  value: string;
  isTotal?: boolean;
}

interface DataRow {
  label: string;
  cells: DataCell[];
  isTotal?: boolean;
  isSubtotal?: boolean;
}

interface CrossData {
  headerRows: HeaderCell[][];
  rows: DataRow[];
}

interface RawRecord {
  [key: string]: string;
}

interface Metric {
  field: string;
  func: string;
}

function collectRecords(): RawRecord[] {
  const tpl = currentTpl.value;
  if (!tpl) return [];

  const records: RawRecord[] = [];
  const tplSub = dataStore.sub[tpl.id] || {};
  const allCols = tpl.columns.filter(c => c.included);
  const ff = tpl.filterField;

  Object.keys(tplSub).forEach((date: string) => {
    if (props.config.dateFrom && date < props.config.dateFrom) return;
    if (props.config.dateTo && date > props.config.dateTo) return;

    const daySub = tplSub[date] || {};
    Object.keys(daySub).forEach((user: string) => {
      if (props.config.selMember && user !== props.config.selMember) return;

      const ud = daySub[user];
      if (!ud) return;

      Object.keys(ud).forEach((ri: string) => {
        const rd = ud[ri];
        if (!rd) return;
        if (!Object.values(rd).some(v => v && String(v).trim())) return;

        const baseRow = (tpl.rows && tpl.rows[parseInt(ri)]) ? tpl.rows[parseInt(ri)] : {};
        const record: RawRecord = { __date: date, __user: user };

        allCols.forEach(c => {
          if (ff && c.header === ff) {
            record[c.header] = user;
          } else if (c.isEditable) {
            record[c.header] = (rd[c.header] || '').trim();
          } else {
            record[c.header] = (baseRow[c.header] || '').trim();
          }
        });

        records.push(record);
      });
    });
  });

  return records;
}

function getDimValues(records: RawRecord[], dim: string): string[] {
  const set = new Set<string>();
  records.forEach((r: RawRecord) => {
    const v = r[dim] || '(空)';
    set.add(v);
  });
  return [...set].sort();
}

function calcAgg(records: RawRecord[], metric: Metric): string {
  if (!records.length) return '-';

  switch (metric.func) {
    case 'count':
      return String(records.length);

    case 'sum': {
      const vals = records.map((r: RawRecord) => parseFloat(r[metric.field] || '')).filter((v: number) => !isNaN(v));
      if (!vals.length) return '-';
      return formatNum(vals.reduce((a: number, b: number) => a + b, 0));
    }

    case 'avg': {
      const vals = records.map((r: RawRecord) => parseFloat(r[metric.field] || '')).filter((v: number) => !isNaN(v));
      if (!vals.length) return '-';
      return formatNum(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
    }

    case 'max': {
      const vals = records.map((r: RawRecord) => parseFloat(r[metric.field] || '')).filter((v: number) => !isNaN(v));
      if (!vals.length) return '-';
      return formatNum(Math.max(...vals));
    }

    case 'min': {
      const vals = records.map((r: RawRecord) => parseFloat(r[metric.field] || '')).filter((v: number) => !isNaN(v));
      if (!vals.length) return '-';
      return formatNum(Math.min(...vals));
    }

    case 'pct': {
      const total = records.length;
      const filled = records.filter((r: RawRecord) => r[metric.field] && r[metric.field].trim()).length;
      return total > 0 ? Math.round((filled / total) * 100) + '%' : '-';
    }

    default:
      return String(records.length);
  }
}

function formatNum(num: number): string {
  if (Number.isInteger(num)) return num.toString();
  return num.toFixed(2);
}

function getFuncLabel(func: string): string {
  const map: Record<string, string> = {
    count: '计数', sum: '求和', avg: '平均',
    max: '最大', min: '最小', pct: '百分比',
  };
  return map[func] || func;
}

const crossData = computed<CrossData>(() => {
  const records = collectRecords();
  const rowDims: string[] = props.config.rowDims;
  const colDims: string[] = props.config.colDims;
  const metrics: Metric[] = props.config.metrics;

  if (!rowDims.length && !colDims.length) {
    return { headerRows: [], rows: [] };
  }

  const rowDimValues: string[][] = rowDims.map((d: string) => getDimValues(records, d));
  const colDimValues: string[][] = colDims.map((d: string) => getDimValues(records, d));

  const headerRows: HeaderCell[][] = [];

  if (colDims.length === 0) {
    const headerRow: HeaderCell[] = [];
    metrics.forEach((m: Metric) => {
      headerRow.push({
        label: getFuncLabel(m.func) + (m.field ? '(' + m.field + ')' : ''),
        colspan: 1,
      });
    });
    headerRows.push(headerRow);
  } else if (colDims.length === 1) {
    const vals: string[] = colDimValues[0];
    const headerRow: HeaderCell[] = [];
    vals.forEach((v: string) => {
      metrics.forEach((m: Metric) => {
        headerRow.push({
          label: v + (metrics.length > 1 ? ' · ' + getFuncLabel(m.func) : ''),
          colspan: 1,
        });
      });
    });
    metrics.forEach((m: Metric) => {
      headerRow.push({
        label: '合计' + (metrics.length > 1 ? ' · ' + getFuncLabel(m.func) : ''),
        colspan: 1,
        isTotal: true,
      });
    });
    headerRows.push(headerRow);
  } else {
    const vals1: string[] = colDimValues[0];
    const vals2: string[] = colDimValues[1];

    const headerRow1: HeaderCell[] = [];
    vals1.forEach((v1: string) => {
      headerRow1.push({
        label: v1,
        colspan: vals2.length * metrics.length,
      });
    });
    headerRow1.push({
      label: '合计',
      colspan: metrics.length,
      isTotal: true,
    });
    headerRows.push(headerRow1);

    const headerRow2: HeaderCell[] = [];
    vals1.forEach(() => {
      vals2.forEach((v2: string) => {
        metrics.forEach((m: Metric) => {
          headerRow2.push({
            label: v2 + (metrics.length > 1 ? ' · ' + getFuncLabel(m.func) : ''),
            colspan: 1,
          });
        });
      });
    });
    metrics.forEach((m: Metric) => {
      headerRow2.push({
        label: getFuncLabel(m.func),
        colspan: 1,
        isTotal: true,
      });
    });
    headerRows.push(headerRow2);
  }

  const rows: DataRow[] = [];

  function generateRows(
    dimIdx: number,
    filterFn: (r: RawRecord) => boolean,
    label: string,
    isSubtotal: boolean
  ) {
    if (dimIdx >= rowDims.length) {
      const filtered: RawRecord[] = records.filter(filterFn);
      const cells: DataCell[] = [];

      if (colDims.length === 0) {
        metrics.forEach((m: Metric) => {
          cells.push({ value: calcAgg(filtered, m) });
        });
      } else if (colDims.length === 1) {
        const vals: string[] = colDimValues[0];
        vals.forEach((v: string) => {
          const colFiltered: RawRecord[] = filtered.filter((r: RawRecord) => (r[colDims[0]] || '(空)') === v);
          metrics.forEach((m: Metric) => {
            cells.push({ value: calcAgg(colFiltered, m) });
          });
        });
        metrics.forEach((m: Metric) => {
          cells.push({ value: calcAgg(filtered, m), isTotal: true });
        });
      } else {
        const vals1: string[] = colDimValues[0];
        const vals2: string[] = colDimValues[1];
        vals1.forEach((v1: string) => {
          vals2.forEach((v2: string) => {
            const colFiltered: RawRecord[] = filtered.filter((r: RawRecord) =>
              (r[colDims[0]] || '(空)') === v1 && (r[colDims[1]] || '(空)') === v2
            );
            metrics.forEach((m: Metric) => {
              cells.push({ value: calcAgg(colFiltered, m) });
            });
          });
        });
        metrics.forEach((m: Metric) => {
          cells.push({ value: calcAgg(filtered, m), isTotal: true });
        });
      }

      rows.push({ label, cells, isSubtotal });
      return;
    }

    const dim: string = rowDims[dimIdx];
    const values: string[] = rowDimValues[dimIdx];

    values.forEach((v: string) => {
      const newFilter = (r: RawRecord) => filterFn(r) && (r[dim] || '(空)') === v;
      generateRows(dimIdx + 1, newFilter, v, false);
    });

    if (rowDims.length > 1 && dimIdx < rowDims.length - 1) {
      const subFilter = filterFn;
      generateRows(rowDims.length, subFilter, label + ' 小计', true);
    }
  }

  if (rowDims.length === 0) {
    const cells: DataCell[] = [];
    if (colDims.length === 0) {
      metrics.forEach((m: Metric) => cells.push({ value: calcAgg(records, m) }));
    } else if (colDims.length === 1) {
      const vals: string[] = colDimValues[0];
      vals.forEach((v: string) => {
        const colFiltered: RawRecord[] = records.filter((r: RawRecord) => (r[colDims[0]] || '(空)') === v);
        metrics.forEach((m: Metric) => cells.push({ value: calcAgg(colFiltered, m) }));
      });
      metrics.forEach((m: Metric) => cells.push({ value: calcAgg(records, m), isTotal: true }));
    } else {
      const vals1: string[] = colDimValues[0];
      const vals2: string[] = colDimValues[1];
      vals1.forEach((v1: string) => {
        vals2.forEach((v2: string) => {
          const colFiltered: RawRecord[] = records.filter((r: RawRecord) =>
            (r[colDims[0]] || '(空)') === v1 && (r[colDims[1]] || '(空)') === v2
          );
          metrics.forEach((m: Metric) => cells.push({ value: calcAgg(colFiltered, m) }));
        });
      });
      metrics.forEach((m: Metric) => cells.push({ value: calcAgg(records, m), isTotal: true }));
    }
    rows.push({ label: '合计', cells, isTotal: true });
  } else {
    generateRows(0, () => true, '', false);

    const totalCells: DataCell[] = [];
    if (colDims.length === 0) {
      metrics.forEach((m: Metric) => totalCells.push({ value: calcAgg(records, m) }));
    } else if (colDims.length === 1) {
      const vals: string[] = colDimValues[0];
      vals.forEach((v: string) => {
        const colFiltered: RawRecord[] = records.filter((r: RawRecord) => (r[colDims[0]] || '(空)') === v);
        metrics.forEach((m: Metric) => totalCells.push({ value: calcAgg(colFiltered, m) }));
      });
      metrics.forEach((m: Metric) => totalCells.push({ value: calcAgg(records, m), isTotal: true }));
    } else {
      const vals1: string[] = colDimValues[0];
      const vals2: string[] = colDimValues[1];
      vals1.forEach((v1: string) => {
        vals2.forEach((v2: string) => {
          const colFiltered: RawRecord[] = records.filter((r: RawRecord) =>
            (r[colDims[0]] || '(空)') === v1 && (r[colDims[1]] || '(空)') === v2
          );
          metrics.forEach((m: Metric) => totalCells.push({ value: calcAgg(colFiltered, m) }));
        });
      });
      metrics.forEach((m: Metric) => totalCells.push({ value: calcAgg(records, m), isTotal: true }));
    }
    rows.push({ label: '合计', cells: totalCells, isTotal: true });
  }

  return { headerRows, rows };
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
}

.empty-hint {
  text-align: center;
  padding: 40px;
  color: var(--tm);
  font-size: 13px;
}

.table-info {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--tm);
  padding: 0 20px 12px;
  flex-wrap: wrap;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--b);
  border-radius: var(--r);
  max-height: 600px;
  overflow-y: auto;
}

.cross-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 400px;
}

.cross-table th,
.cross-table td {
  padding: 8px 12px;
  text-align: center;
  border: 1px solid var(--b);
}

/* 角落单元格 */
.corner-cell {
  background: var(--bl);
  font-weight: 600;
  color: var(--ts);
  font-size: 12px;
  vertical-align: middle;
  min-width: 80px;
}

/* 列头 */
.col-header {
  background: var(--bl);
  font-weight: 600;
  color: var(--ts);
  font-size: 12px;
  white-space: nowrap;
}

.col-total {
  background: var(--p3);
  color: var(--p);
}

/* 行头 */
.row-header {
  background: var(--bl);
  font-weight: 500;
  color: var(--t);
  text-align: left;
  font-size: 13px;
  white-space: nowrap;
  min-width: 80px;
}

.row-total-header {
  background: var(--p3);
  color: var(--p);
  font-weight: 700;
}

.row-subtotal-header {
  background: var(--al);
  color: var(--a);
  font-weight: 600;
  font-size: 12px;
}

/* 数据单元格 */
.data-cell {
  font-size: 13px;
  color: var(--t);
  white-space: nowrap;
}

.data-cell.cell-total {
  background: var(--p3);
  font-weight: 700;
  color: var(--p);
}

.data-cell.cell-empty {
  color: var(--tm);
  font-style: italic;
}

/* 行样式 */
.row-total td {
  background: var(--p3);
  font-weight: 700;
}

.row-subtotal td {
  background: var(--al);
  font-weight: 600;
  font-size: 12px;
}

:host {
  padding-bottom: 70px;
}
</style>
