<template>
  <div>
    <div class="admin-cd">
      <div class="cd-title">🔢 数值字段统计</div>
      <p style="font-size: 12px; color: var(--tm); margin-bottom: 12px;">
        对模板中类型为"数字"的字段进行求和、平均、最大、最小统计
      </p>

      <!-- 日期筛选 -->
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
        <label class="filter-label">日期范围</label>
        <input type="date" class="filter-date" v-model="selDateFrom" :max="selDateTo || undefined" />
        <span style="color: var(--tm);">至</span>
        <input type="date" class="filter-date" v-model="selDateTo" :min="selDateFrom || undefined" />
        <button v-if="selDateFrom || selDateTo" class="btn btn-sm btn-ghost" @click="selDateFrom = ''; selDateTo = ''">清除</button>
      </div>

      <!-- 成员筛选 -->
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
        <label class="filter-label">填报人</label>
        <select class="filter-select" v-model="selMember">
          <option value="">全部成员</option>
          <option v-for="m in availableMembers" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>
    </div>

    <!-- 无数字字段提示 -->
    <div v-if="!numFields.length" class="admin-cd empty-hint">
      当前模板没有数字类型的字段
    </div>

    <!-- 统计结果 -->
    <div v-else>
      <div v-for="field in numFields" :key="field.header" class="admin-cd">
        <div class="cd-title" style="display: flex; align-items: center; gap: 8px;">
          <span class="field-type-badge">🔢</span>
          {{ field.header }}
          <span style="margin-left: auto; font-size: 12px; color: var(--tm); font-weight: 400;">
            共 {{ fieldStats[field.header].count }} 个有效值
          </span>
        </div>

        <div class="stat-grid">
          <div class="stat-item stat-item-sum">
            <div class="stat-item-label">求和</div>
            <div class="stat-item-value">{{ formatNum(fieldStats[field.header].sum) }}</div>
          </div>
          <div class="stat-item stat-item-avg">
            <div class="stat-item-label">平均值</div>
            <div class="stat-item-value">{{ formatNum(fieldStats[field.header].avg) }}</div>
          </div>
          <div class="stat-item stat-item-max">
            <div class="stat-item-label">最大值</div>
            <div class="stat-item-value">{{ formatNum(fieldStats[field.header].max) }}</div>
          </div>
          <div class="stat-item stat-item-min">
            <div class="stat-item-label">最小值</div>
            <div class="stat-item-value">{{ formatNum(fieldStats[field.header].min) }}</div>
          </div>
          <div class="stat-item stat-item-count">
            <div class="stat-item-label">有效值数</div>
            <div class="stat-item-value">{{ fieldStats[field.header].count }}</div>
          </div>
          <div class="stat-item stat-item-empty">
            <div class="stat-item-label">空值数</div>
            <div class="stat-item-value">{{ fieldStats[field.header].empty }}</div>
          </div>
        </div>

        <!-- 值分布（最多显示 top 10） -->
        <div v-if="fieldStats[field.header].topValues.length" class="value-dist">
          <div class="value-dist-title">值分布 Top 10</div>
          <div class="value-dist-bars">
            <div
              v-for="(item, idx) in fieldStats[field.header].topValues"
              :key="idx"
              class="value-dist-item"
            >
              <div class="value-dist-label">{{ item.value }}</div>
              <div class="value-dist-bar-bg">
                <div
                  class="value-dist-bar-fill"
                  :style="{ width: getDistBarWidth(item.count, field.header) + '%' }"
                ></div>
              </div>
              <div class="value-dist-count">{{ item.count }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDataStore } from '@/stores/useDataStore';
import type { Template, Column } from '@/types';

const props = defineProps<{ tplId: string }>();

const dataStore = useDataStore();

const selDateFrom = ref('');
const selDateTo = ref('');
const selMember = ref('');
// 起始日期变化时，如果结束日期早于起始日期，自动修正
watch(selDateFrom, (val) => {
  if (val && selDateTo.value && selDateTo.value < val) {
    selDateTo.value = val;
  }
});

// 结束日期变化时，如果起始日期晚于结束日期，自动修正
watch(selDateTo, (val) => {
  if (val && selDateFrom.value && selDateFrom.value > val) {
    selDateFrom.value = val;
  }
});

// 目标模板
const targetTpls = computed<Template[]>(() => {
  if (props.tplId) {
    const tpl = dataStore.tpls.find(t => t.id === props.tplId);
    return tpl ? [tpl] : [];
  }
  return dataStore.tpls;
});

// 数字字段
const numFields = computed<Column[]>(() => {
  const fields: Column[] = [];
  targetTpls.value.forEach(tpl => {
    tpl.columns.filter(c => c.type === 'number' && c.included && c.isEditable).forEach(c => {
      if (!fields.find(f => f.header === c.header)) {
        fields.push(c);
      }
    });
  });
  return fields;
});

// 可用成员
const availableMembers = computed(() => {
  const members = new Set<string>();
  targetTpls.value.forEach(tpl => {
    dataStore.getTplMembers(tpl.id).forEach(m => members.add(m));
  });
  return [...members].sort();
});

// 统计结果
const fieldStats = computed(() => {
  const result: Record<string, {
    sum: number; avg: number; max: number; min: number;
    count: number; empty: number;
    topValues: { value: string; count: number }[];
  }> = {};

  numFields.value.forEach(field => {
    const values: number[] = [];
    const valueMap: Record<string, number> = {};
    let empty = 0;

    targetTpls.value.forEach(tpl => {
      const tplSub = dataStore.sub[tpl.id] || {};
      Object.keys(tplSub).forEach(date => {
        // 日期筛选
        if (selDateFrom.value && date < selDateFrom.value) return;
        if (selDateTo.value && date > selDateTo.value) return;

        const daySub = tplSub[date] || {};
        Object.keys(daySub).forEach(user => {
          // 成员筛选
          if (selMember.value && user !== selMember.value) return;

          const ud = daySub[user];
          if (!ud) return;
          Object.keys(ud).forEach(ri => {
            const rd = ud[ri];
            if (!rd) return;
            const val = (rd[field.header] || '').trim();
            if (!val) {
              empty++;
              return;
            }
            const num = parseFloat(val);
            if (!isNaN(num)) {
              values.push(num);
              valueMap[val] = (valueMap[val] || 0) + 1;
            } else {
              empty++;
            }
          });
        });
      });
    });

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = values.length > 0 ? sum / values.length : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;
    const min = values.length > 0 ? Math.min(...values) : 0;

    // Top 10 值分布
    const topValues = Object.entries(valueMap)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    result[field.header] = { sum, avg, max, min, count: values.length, empty, topValues };
  });

  return result;
});

// 工具函数
function formatNum(num: number): string {
  if (Number.isInteger(num)) return num.toString();
  return num.toFixed(2);
}

function getDistBarWidth(count: number, header: string): number {
  const stats = fieldStats.value[header];
  if (!stats || !stats.topValues.length) return 0;
  const maxCount = stats.topValues[0].count;
  return maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
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

.field-type-badge {
  font-size: 16px;
}

/* 统计网格 */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.stat-item {
  padding: 12px;
  border-radius: var(--r);
  border: 1px solid var(--b);
  text-align: center;
}

.stat-item-label {
  font-size: 11px;
  color: var(--tm);
  margin-bottom: 4px;
}

.stat-item-value {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-item-sum { background: var(--pl); }
.stat-item-sum .stat-item-value { color: var(--p); }

.stat-item-avg { background: var(--al); }
.stat-item-avg .stat-item-value { color: var(--a); }

.stat-item-max { background: var(--okl); }
.stat-item-max .stat-item-value { color: var(--ok); }

.stat-item-min { background: var(--wl); }
.stat-item-min .stat-item-value { color: var(--w); }

.stat-item-count { background: var(--bl); }
.stat-item-count .stat-item-value { color: var(--t); }

.stat-item-empty { background: var(--dl); }
.stat-item-empty .stat-item-value { color: var(--d); }

/* 值分布 */
.value-dist {
  margin-top: 12px;
}

.value-dist-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--ts);
  margin-bottom: 8px;
}

.value-dist-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.value-dist-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.value-dist-label {
  font-size: 12px;
  color: var(--t);
  min-width: 60px;
  text-align: right;
  font-family: monospace;
}

.value-dist-bar-bg {
  flex: 1;
  height: 14px;
  background: var(--bl);
  border-radius: 3px;
  overflow: hidden;
}

.value-dist-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--p), var(--pl));
  border-radius: 3px;
  transition: width 0.3s ease;
  min-width: 2px;
}

.value-dist-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--p);
  min-width: 30px;
  text-align: right;
}

:host {
  padding-bottom: 70px;
}

.filter-date {
  flex: 1;
  min-width: 130px;
  padding: 7px 12px;
  border: 1px solid var(--border);
  border-radius: var(--r);
  font-size: 13px;
  font-family: inherit;
  color: var(--t);
  background: var(--sf);
  outline: none;
}

.filter-date:focus {
  border-color: var(--p);
}
</style>
