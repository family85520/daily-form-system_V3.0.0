<template>
  <div>
    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card stat-card-primary">
        <div class="stat-card-icon">📋</div>
        <div class="stat-card-body">
          <div class="stat-card-value">{{ summary.totalTemplates }}</div>
          <div class="stat-card-label">模板数</div>
        </div>
      </div>
      <div class="stat-card stat-card-ok">
        <div class="stat-card-icon">✅</div>
        <div class="stat-card-body">
          <div class="stat-card-value">{{ summary.totalFilled }}</div>
          <div class="stat-card-label">已填报</div>
        </div>
      </div>
      <div class="stat-card stat-card-warn">
        <div class="stat-card-icon">⏳</div>
        <div class="stat-card-body">
          <div class="stat-card-value">{{ summary.totalUnfilled }}</div>
          <div class="stat-card-label">未填报</div>
        </div>
      </div>
      <div class="stat-card stat-card-info">
        <div class="stat-card-icon">📊</div>
        <div class="stat-card-body">
          <div class="stat-card-value">{{ summary.completionRate }}%</div>
          <div class="stat-card-label">完成率</div>
        </div>
      </div>
    </div>

    <!-- 趋势图（最近 14 天） -->
    <div class="admin-cd">
      <div class="cd-title">📈 填报趋势（最近14天）</div>
      <div v-if="!trendData.length" class="empty-hint">暂无趋势数据</div>
      <div v-else class="trend-chart">
        <div class="trend-bars">
          <div v-for="(item, idx) in trendData" :key="idx" class="trend-bar-item">
            <div class="trend-bar-wrap">
              <div
                class="trend-bar"
                :style="{ height: getBarHeight(item.count) + '%' }"
                :title="item.date + ': ' + item.count + '条'"
              >
                <span v-if="item.count > 0" class="trend-bar-value">{{ item.count }}</span>
              </div>
            </div>
            <div class="trend-bar-label">{{ formatShortDate(item.date) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 模板完成率 -->
    <div class="admin-cd">
      <div class="cd-title">📋 模板填报完成率</div>
      <div v-if="!tplStats.length" class="empty-hint">暂无模板数据</div>
      <div v-else class="tpl-stats-list">
        <div v-for="ts in tplStats" :key="ts.tplId" class="tpl-stat-item">
          <div class="tpl-stat-header">
            <span class="tpl-stat-name">{{ ts.tplName }}</span>
            <span class="tpl-stat-rate" :style="{ color: getRateColor(ts.rate) }">{{ ts.rate }}%</span>
          </div>
          <div class="tpl-stat-bar-bg">
            <div
              class="tpl-stat-bar-fill"
              :style="{ width: ts.rate + '%', background: getRateColor(ts.rate) }"
            ></div>
          </div>
          <div class="tpl-stat-detail">
            {{ ts.totalFilled }}/{{ ts.totalExpected }} 项已填 · {{ ts.members.length }} 位填报人 · {{ ts.dates.length }} 天有数据
          </div>
        </div>
      </div>
    </div>

    <!-- 成员完成率 -->
    <div class="admin-cd">
      <div class="cd-title">👥 成员填报完成率</div>
      <div v-if="!memberStats.length" class="empty-hint">暂无成员数据</div>
      <div v-else class="member-stats-list">
        <div v-for="ms in memberStats" :key="ms.user" class="member-stat-item">
          <div class="member-stat-header">
            <span class="member-stat-avatar">{{ ms.user.charAt(0) }}</span>
            <span class="member-stat-name">{{ ms.user }}</span>
            <span class="member-stat-rate" :style="{ color: getRateColor(ms.rate) }">{{ ms.rate }}%</span>
          </div>
          <div class="tpl-stat-bar-bg">
            <div
              class="tpl-stat-bar-fill"
              :style="{ width: ms.rate + '%', background: getRateColor(ms.rate) }"
            ></div>
          </div>
          <div class="tpl-stat-detail">
            {{ ms.filled }}/{{ ms.expected }} 项已填 · 活跃 {{ ms.activeDays }} 天
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDataStore } from '@/stores/useDataStore';
import type { Template } from '@/types';

const props = defineProps<{ tplId: string }>();

const dataStore = useDataStore();

// 获取要统计的模板列表
const targetTpls = computed<Template[]>(() => {
  if (props.tplId) {
    const tpl = dataStore.tpls.find(t => t.id === props.tplId);
    return tpl ? [tpl] : [];
  }
  return dataStore.tpls;
});

// 总体摘要（按条目数统计）
const summary = computed(() => {
  const tpls = targetTpls.value;
  const totalTemplates = tpls.length;
  let totalFilled = 0;
  let totalUnfilled = 0;
  let totalExpected = 0;

  tpls.forEach(tpl => {
    const tplSub = dataStore.sub[tpl.id] || {};
    const members = dataStore.getTplMembers(tpl.id);
    const rowCount = tpl.rows ? tpl.rows.length : 0;

    if (!members.length || !rowCount) {
      // 无成员或无行时，只统计已有数据（每行=1条）
      Object.values(tplSub).forEach(daySub => {
        Object.values(daySub || {}).forEach(ud => {
          if (!ud) return;
          Object.values(ud).forEach(rd => {
            if (rd && Object.values(rd).some(v => v && String(v).trim())) {
              totalFilled++;
            }
          });
        });
      });
      return;
    }

    // 有成员时：按条目数（每行=1条）统计
    Object.values(tplSub).forEach(daySub => {
      members.forEach(user => {
        const ud = (daySub as Record<string, unknown>)[user] as Record<string, Record<string, string>> | undefined;
        for (let ri = 0; ri < rowCount; ri++) {
          totalExpected++;
          const rd = ud ? ud[String(ri)] : null;
          if (rd && Object.values(rd).some(v => v && String(v).trim())) {
            totalFilled++;
          } else {
            totalUnfilled++;
          }
        }
      });
    });
  });

  const completionRate = totalExpected > 0 ? Math.round((totalFilled / totalExpected) * 100) : 0;

  return { totalTemplates, totalFilled, totalUnfilled, totalExpected, completionRate };
});

// 趋势数据（最近14天）
const trendData = computed(() => {
  const result: { date: string; count: number }[] = [];
  const today = new Date();

  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    let count = 0;
    targetTpls.value.forEach(tpl => {
      const daySub = (dataStore.sub[tpl.id] || {})[dateStr] || {};
      Object.keys(daySub).forEach(user => {
        const ud = daySub[user];
        if (!ud) return;
        Object.keys(ud).forEach(ri => {
          const rd = ud[ri];
          if (rd && Object.values(rd).some(v => v && String(v).trim())) {
            count++;
          }
        });
      });
    });

    result.push({ date: dateStr, count });
  }

  return result;
});

// 模板统计
const tplStats = computed(() => {
  return targetTpls.value.map(tpl => {
    const tplSub = dataStore.sub[tpl.id] || {};
    const members = dataStore.getTplMembers(tpl.id);
    const rowCount = tpl.rows ? tpl.rows.length : 0;
    const dates = Object.keys(tplSub);

    let totalFilled = 0;
    let totalExpected = 0;

    if (members.length && rowCount) {
      dates.forEach(date => {
        const daySub = tplSub[date] || {};
        members.forEach(user => {
          const ud = daySub[user];
          for (let ri = 0; ri < rowCount; ri++) {
            totalExpected++;
            if (ud && ud[String(ri)] && Object.values(ud[String(ri)]).some(v => v && String(v).trim())) {
              totalFilled++;
            }
          }
        });
      });
    }

    const rate = totalExpected > 0 ? Math.round((totalFilled / totalExpected) * 100) : 0;

    return {
      tplId: tpl.id,
      tplName: tpl.name,
      totalFilled,
      totalExpected,
      rate,
      members,
      dates,
    };
  });
});

// 成员统计
const memberStats = computed(() => {
  const userMap: Record<string, { filled: number; expected: number; activeDays: Set<string> }> = {};

  targetTpls.value.forEach(tpl => {
    const tplSub = dataStore.sub[tpl.id] || {};
    const members = dataStore.getTplMembers(tpl.id);
    const rowCount = tpl.rows ? tpl.rows.length : 0;

    if (!members.length || !rowCount) return;

    members.forEach(user => {
      if (!userMap[user]) userMap[user] = { filled: 0, expected: 0, activeDays: new Set() };

      Object.keys(tplSub).forEach(date => {
        const daySub = tplSub[date] || {};
        const ud = daySub[user];
        let hasData = false;

        for (let ri = 0; ri < rowCount; ri++) {
          userMap[user].expected++;
          if (ud && ud[String(ri)] && Object.values(ud[String(ri)]).some(v => v && String(v).trim())) {
            userMap[user].filled++;
            hasData = true;
          }
        }

        if (hasData) userMap[user].activeDays.add(date);
      });
    });
  });

  return Object.entries(userMap)
    .map(([user, data]) => ({
      user,
      filled: data.filled,
      expected: data.expected,
      rate: data.expected > 0 ? Math.round((data.filled / data.expected) * 100) : 0,
      activeDays: data.activeDays.size,
    }))
    .sort((a, b) => b.rate - a.rate);
});

// 工具函数
function getBarHeight(count: number): number {
  const maxCount = Math.max(...trendData.value.map(d => d.count), 1);
  return Math.max((count / maxCount) * 100, count > 0 ? 8 : 0);
}

function formatShortDate(dateStr: string): string {
  const parts = dateStr.split('-');
  return parts[1] + '/' + parts[2];
}

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
  padding: 24px;
  color: var(--tm);
  font-size: 13px;
}

/* 统计卡片 */
.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: var(--rl);
  border: 1px solid var(--b);
  background: var(--sf);
}

.stat-card-icon {
  font-size: 28px;
  opacity: 0.7;
}

.stat-card-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-card-label {
  font-size: 12px;
  color: var(--tm);
  margin-top: 2px;
}

.stat-card-primary .stat-card-value { color: var(--p); }
.stat-card-ok .stat-card-value { color: var(--ok); }
.stat-card-warn .stat-card-value { color: var(--w); }
.stat-card-info .stat-card-value { color: var(--a); }

/* 趋势图 */
.trend-chart {
  padding: 8px 0;
  overflow: hidden;
}

.trend-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 160px;
  overflow: hidden;
}

.trend-bar-item {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.trend-bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
}

.trend-bar {
  width: 100%;
  max-width: 36px;
  background: linear-gradient(180deg, var(--p), var(--pl));
  border-radius: 4px 4px 0 0;
  min-height: 2px;
  transition: height 0.3s ease;
  position: relative;
  cursor: pointer;
}

.trend-bar:hover {
  opacity: 0.85;
}

.trend-bar-value {
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 600;
  color: var(--p);
  white-space: nowrap;
  pointer-events: none;
}

.trend-bar-label {
  font-size: 10px;
  color: var(--tm);
  margin-top: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  text-align: center;
}

@media (max-width: 480px) {
  .trend-bars {
    gap: 2px;
    height: 140px;
  }

  .trend-bar {
    max-width: 20px;
    border-radius: 2px 2px 0 0;
  }

  .trend-bar-value {
    font-size: 8px;
    top: -14px;
  }

  .trend-bar-label {
    font-size: 8px;
    margin-top: 4px;
  }
}

/* 模板统计 */
.tpl-stats-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tpl-stat-item {
  padding: 12px;
  background: var(--bl);
  border-radius: var(--r);
  border: 1px solid var(--b);
}

.tpl-stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.tpl-stat-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--t);
}

.tpl-stat-rate {
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

/* 成员统计 */
.member-stats-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-stat-item {
  padding: 12px;
  background: var(--bl);
  border-radius: var(--r);
  border: 1px solid var(--b);
}

.member-stat-header {
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

.member-stat-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--t);
}

.member-stat-rate {
  font-size: 16px;
  font-weight: 700;
}

:host {
  padding-bottom: 70px;
}
</style>
