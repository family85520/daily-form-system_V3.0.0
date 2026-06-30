<template>
  <!-- 未选择模板 -->
  <div v-if="!dataStore.activeTemplateId">
    <!-- 页面标题 -->
    <div class="page-header">
      <div>
        <h1 class="heading-section">📋 选择填报模板</h1>
        <p class="text-body">共 {{ dataStore.tpls.length }} 个可用模板</p>
      </div>
    </div>
    <div v-if="!dataStore.tpls.length" class="empty-state">
      <span class="empty-icon">📋</span>
      <p>暂无填报模板</p>
      <p style="font-size: 12px; margin-top: 8px;">请前往「管理」导入 Excel 数据创建模板</p>
    </div>
    <div v-else class="tpl-grid">
      <div
        v-for="tpl in dataStore.tpls"
        :key="tpl.id"
        class="tpl-card"
        @click="dataStore.setActiveTemplate(tpl.id)"
      >
        <div class="tpl-card-icon">{{ (tpl.name || '?').charAt(0) }}</div>
        <div class="tpl-card-name">{{ tpl.name }}</div>
        <div class="tpl-card-meta">
          <span>📊 {{ tpl.rows ? tpl.rows.length : 0 }} 行</span>
          <span>✏️ {{ editableCount(tpl) }} 可填列</span>
          <span>👥 {{ dataStore.getTplMembers(tpl.id).length }} 人</span>
        </div>
        <div class="tpl-card-enter">→</div>
      </div>
    </div>
  </div>

  <!-- 已选择模板 -->
  <div v-else-if="activeTemplate" class="fill-layout">
    <FillSidebar
      :template="activeTemplate"
      :current-user="currentUser"
      :current-date="currentDate"
      :stat-filter="currentStatFilter"
      :fill-stats="fillStats"
      :show-inherit-hint="showInheritHint"
      :search-text="searchText"
      :match-count="searchFilteredRows.length"
      @update:search-text="searchText = $event"
      @select-user="onUserSelect"
      @set-filter="onSetFilter"
      @inherit-prev="onInheritPrev"
      @inherit-base="onInheritBase"
      @back="onBack"
      @reset="onReset"
    />
    <FillMain
      :template="activeTemplate"
      :current-user="currentUser"
      :current-date="currentDate"
      :filtered-rows="searchFilteredRows"
      :effective-values="effectiveValues"
      :user-data="currentUserData"
      :search-text="searchText"
      @submit-all="onSubmitAll"
      @add-row="showAddRow = true"
      @batch-add="showBatchAdd = true"
      @open-quick-fill="onOpenQuickFill"
    />
  </div>

  <!-- 模板不存在 -->
  <div v-else>
    <n-result status="404" title="模板不存在" description="请返回选择其他模板">
      <template #footer>
        <n-button @click="dataStore.setActiveTemplate('')">返回</n-button>
      </template>
    </n-result>
  </div>

  <!-- 弹窗 -->
  <AddRowDialog
    v-if="showAddRow && activeTemplate"
    :show="true"
    :template="activeTemplate"
    :current-user="currentUser"
    :current-date="currentDate"
    @close="showAddRow = false"
    @saved="onDataChanged"
  />

  <BatchAddDialog
    v-if="showBatchAdd && activeTemplate"
    :show="true"
    :template="activeTemplate"
    :current-user="currentUser"
    :current-date="currentDate"
    @close="showBatchAdd = false"
    @saved="onDataChanged"
  />

  <QuickFillDialog
    v-if="quickFillState && activeTemplate"
    :show="true"
    :template="activeTemplate"
    :row-index="quickFillState.rowIndex"
    :current-user="currentUser"
    :current-date="currentDate"
    :effective-values="effectiveValues"
    @close="quickFillState = null"
    @saved="onDataChanged"
  />

    <!-- 错误列表弹窗 -->
  <ErrorListModal
    :show="showErrors"
    :errors="errorList"
    @close="showErrors = false"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { NButton, NResult } from 'naive-ui';
import { useDataStore } from '@/stores/useDataStore';
import { useInheritance } from '@/composables/useInheritance';
import { useValidation } from '@/composables/useValidation';
import { useToast } from '@/composables/useToast';
import { useFormSessionEdits } from '@/composables/useFormSessionEdits';
import { normalizeDate, getCurrentDate } from '@/utils/date';
import type { Template, EffectiveRow, StatFilterMode } from '@/types';
import FillSidebar from '@/components/fill/FillSidebar.vue';
import FillMain from '@/components/fill/FillMain.vue';
import AddRowDialog from '@/components/fill/AddRowDialog.vue';
import BatchAddDialog from '@/components/fill/BatchAddDialog.vue';
import QuickFillDialog from '@/components/fill/QuickFillDialog.vue';
import ErrorListModal from '@/components/common/ErrorListModal.vue';

const dataStore = useDataStore();
const { batchGetEffectiveRows, hasPrevData, hasTodayData } = useInheritance();
const { validateAndApplyRules } = useValidation();
const { toastSuccess, toastWarning } = useToast();
const { clearAll: clearSessionEdits } = useFormSessionEdits();

// ===== 页面状态 =====
const currentStatFilter = ref<StatFilterMode>('all');
const filterOverride = ref<{ field: string; value: string } | null>(null);
const showAddRow = ref(false);
const showBatchAdd = ref(false);
const showErrors = ref(false);
const errorList = ref<string[]>([]);
const quickFillState = ref<{ rowIndex: number } | null>(null);
const currentUser = computed({
  get: () => dataStore.currentFillUser,
  set: (val: string) => dataStore.setCurrentFillUser(val),
});

const searchText = ref('');


// ===== 计算属性 =====
const currentDate = computed(() => getCurrentDate());

const activeTemplate = computed(() => dataStore.activeTemplate);

const currentUserData = computed(() => {
  if (!activeTemplate.value || !currentUser.value) return {};
  return ((dataStore.sub[activeTemplate.value.id] || {})[currentDate.value] || {})[currentUser.value] || {};
});

// 筛选后的行
const filteredRows = computed(() => {
  if (!activeTemplate.value || !activeTemplate.value.rows) return [];
  const tpl = activeTemplate.value;
  const ff = tpl.filterField;

  // 第一步：按填报人筛选
  let fv = '';
  if (ff && tpl.columns.find(c => c.header === ff && c.included)) {
    if (filterOverride.value && filterOverride.value.field === ff) {
      fv = filterOverride.value.value;
    } else if (currentUser.value) {
      fv = currentUser.value;
    }
  }

  let rows = tpl.rows.map((row, i) => ({ idx: i, row }));

  if (fv) {
    rows = rows.filter(item => (item.row[ff] || '').trim() === fv.trim());
  }

  // 第二步：按统计筛选
  if (currentStatFilter.value !== 'all' && currentUser.value) {
    const ds = (dataStore.sub[tpl.id] || {})[currentDate.value] || {};
    const userData = ds[currentUser.value] || {};

    if (currentStatFilter.value === 'filled') {
      rows = rows.filter(item => {
        const rd = userData[item.idx];
        return rd && typeof rd === 'object' && Object.values(rd).some(v => v && String(v).trim());
      });
    } else if (currentStatFilter.value === 'unfilled') {
      rows = rows.filter(item => {
        const rd = userData[item.idx];
        if (!rd || typeof rd !== 'object') return true;
        return !Object.values(rd).some(v => v && String(v).trim());
      });
    }
  }

  return rows;
});

// 搜索过滤（在 filteredRows 基础上按关键字进一步过滤）
const searchFilteredRows = computed(() => {
  const keyword = searchText.value.trim().toLowerCase();
  if (!keyword) return filteredRows.value;

  const tpl = activeTemplate.value;
  if (!tpl) return filteredRows.value;

  const allCols = tpl.columns.filter(c => c.included !== false);

  return filteredRows.value.filter(item => {
    const baseRow = item.row;
    const subRow = (currentUserData.value as Record<string, Record<string, string>>)[String(item.idx)] || {};

    return allCols.some(c => {
      const val = c.isEditable
        ? (subRow[c.header] || baseRow[c.header] || '')
        : (baseRow[c.header] || '');
      return String(val).toLowerCase().includes(keyword);
    });
  });
});

// 批量计算有效值
const effectiveValues = computed<EffectiveRow[]>(() => {
  if (!activeTemplate.value || !currentUser.value) return [];
  return batchGetEffectiveRows(activeTemplate.value, currentDate.value, currentUser.value);
});

// 填报统计
const fillStats = computed(() => {
  if (!activeTemplate.value) return { filled: 0, total: 0, remaining: 0, templateRows: 0 };
  const tpl = activeTemplate.value;
  const templateRows = tpl.rows?.length || 0;

  if (!currentUser.value) {
    return { filled: 0, total: 0, remaining: 0, templateRows };
  }

  // 按填报人筛选出该人的行
  const ff = tpl.filterField;
  let userRows: { idx: number; row: Record<string, string> }[] = [];

  if (tpl.rows && ff && tpl.columns.find(c => c.header === ff && c.included)) {
    userRows = tpl.rows
      .map((row, i) => ({ idx: i, row }))
      .filter(item => (item.row[ff] || '').trim() === currentUser.value.trim());
  } else if (tpl.rows) {
    userRows = tpl.rows.map((row, i) => ({ idx: i, row }));
  }

  const total = userRows.length;

  const ds = (dataStore.sub[tpl.id] || {})[currentDate.value] || {};
  const userData = ds[currentUser.value] || {};
  const filled = userRows.filter(item => {
    const rd = userData[item.idx];
    return rd && typeof rd === 'object' && Object.values(rd).some(v => v && String(v).trim());
  }).length;

  return { filled, total, remaining: total - filled, templateRows };
});

// 继承提示
const showInheritHint = computed(() => {
  if (!activeTemplate.value || !currentUser.value) return false;
  return !hasTodayData(activeTemplate.value, currentDate.value, currentUser.value) &&
         hasPrevData(activeTemplate.value, currentDate.value, currentUser.value);
});

// ===== 工具函数 =====
function editableCount(tpl: Template): number {
  return tpl.columns ? tpl.columns.filter(c => c.isEditable && c.included).length : 0;
}

// ===== 事件处理 =====
function onUserSelect(user: string) {
  clearSessionEdits();
  searchText.value = '';
  dataStore.setCurrentFillUser(user || '');
  currentStatFilter.value = 'all';
  if (activeTemplate.value && activeTemplate.value.filterField && user) {
    filterOverride.value = { field: activeTemplate.value.filterField, value: user };
  } else {
    filterOverride.value = null;
  }
}

function onSetFilter(filter: StatFilterMode) {
  if (!currentUser.value) return;
  currentStatFilter.value = currentStatFilter.value === filter ? 'all' : filter;
}

function onBack() {
  clearSessionEdits();
  dataStore.setActiveTemplate('');
  dataStore.setCurrentFillUser('');
  filterOverride.value = null;
}

async function onReset() {
  try {
    if (!activeTemplate.value || !currentUser.value) return;
    const tpl = activeTemplate.value;
    const cd = currentDate.value;
    const cu = currentUser.value;
    const ff = tpl.filterField;
    const eCols = tpl.columns.filter(c => c.isEditable && c.included);

    const bd: Record<string, Record<string, string>> = {};
    const rows = tpl.rows || [];

    rows.forEach((row, ri) => {
      if (ff && tpl.columns.find(c => c.header === ff && c.included)) {
        if ((row[ff] || '').trim() !== cu.trim()) return;
      }

      const rd: Record<string, string> = {};
      eCols.forEach(c => {
        rd[c.header] = row[c.header] || '';
      });
      bd[String(ri)] = rd;
    });

    if (!Object.keys(bd).length) {
      toastWarning('无匹配的基础数据可重置');
      return;
    }

    await dataStore.saveSubmission(tpl.id, cd, cu, bd);
    toastSuccess('✓ 已重置为基础数据（' + Object.keys(bd).length + ' 行）');
  } catch (_err) {
    console.error('重置数据失败:', _err);
    toastWarning('重置失败，请重试');
  }
}

function onDataChanged() {
  // Vue 响应式自动更新
}

function onOpenQuickFill(rowIndex: number) {
  quickFillState.value = { rowIndex };
}

async function onInheritPrev() {
  try {
    if (!activeTemplate.value || !currentUser.value) return;
    const tpl = activeTemplate.value;
    const cd = currentDate.value;
    const cu = currentUser.value;

    const d = new Date(cd);
    d.setDate(d.getDate() - 1);
    const pd = d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');

    const pd2 = ((dataStore.sub[tpl.id] || {})[pd] || {})[cu];
    if (!pd2) {
      toastWarning('未找到昨日数据');
      return;
    }

    const copied: Record<string, Record<string, string>> = {};
    Object.keys(pd2).forEach(ri => { copied[ri] = { ...pd2[ri] }; });

    await dataStore.saveSubmission(tpl.id, cd, cu, copied);
    toastSuccess('✓ 已继承昨日数据');
  } catch (_err) {
    console.error('继承昨日数据失败:', _err);
    toastWarning('继承失败，请重试');
  }
}

async function onInheritBase() {
  try {
    if (!activeTemplate.value || !currentUser.value) return;
    const tpl = activeTemplate.value;
    const cd = currentDate.value;
    const cu = currentUser.value;
    const eCols = tpl.columns.filter(c => c.isEditable && c.included);

    const bd: Record<string, Record<string, string>> = {};
    filteredRows.value.forEach(item => {
      const rd: Record<string, string> = {};
      eCols.forEach(c => { rd[c.header] = item.row[c.header] || ''; });
      bd[item.idx] = rd;
    });

    if (!Object.keys(bd).length) {
      toastWarning('当前填报人无匹配的基础数据');
      return;
    }

    await dataStore.saveSubmission(tpl.id, cd, cu, bd);
    toastSuccess('✓ 已加载基础数据（' + Object.keys(bd).length + '行）');
  } catch (_err) {
    console.error('加载基础数据失败:', _err);
    toastWarning('加载失败，请重试');
  }
}

async function onSubmitAll() {
  try {
    if (!activeTemplate.value || !currentUser.value) {
      toastWarning('请先选择模板和填报人');
      return;
    }
    const tpl = activeTemplate.value;
    const cd = currentDate.value;
    const cu = currentUser.value;
    const ff = tpl.filterField;
    const allCols = tpl.columns.filter(c => c.included);
    const existing = ((dataStore.sub[tpl.id] || {})[cd] || {})[cu] || {};

    const allD: Record<string, Record<string, string>> = {};
    let hasValue = false;
    const allErrors: string[] = [];

    filteredRows.value.forEach(item => {
      const ri = item.idx;
      const rd: Record<string, string> = {};
      const baseRow = (tpl.rows && tpl.rows[ri]) ? tpl.rows[ri] : {};
      const existRow = existing[ri] || {};

      allCols.forEach(c => {
        if (ff && c.header === ff) {
          rd[c.header] = cu;
          hasValue = true;
        } else if (c.type === 'sequence') {
          rd[c.header] = existRow[c.header] || baseRow[c.header] || '';
        } else if (c.isEditable) {
          // 校验数据 = 显示数据（与 RecordForm.fieldValue 逻辑一致）
          let val: string;
          if (existRow[c.header] !== undefined && existRow[c.header] !== null) {
            // store 有该字段 → 用户编辑/显式继承的值
            val = (existRow[c.header] || '').trim();
          } else {
            // store 无该字段 → 回退到 effectiveValues（继承链）
            const ev = effectiveValues.value[ri]?.[c.header];
            val = ev?.val || '';
          }
          // 日期字段标准化
          if (c.type === 'date' && val) {
            val = normalizeDate(val);
          }
          rd[c.header] = val;
          if (rd[c.header]) hasValue = true;
        }
         else {
          // 不可填字段读基础数据
          rd[c.header] = baseRow[c.header] || '';
        }
      });

      const rowErrors = validateAndApplyRules(tpl, ri, rd, allCols, ff, cu);
      if (rowErrors.length) {
        const rowTitle = getRowTitle(tpl, tpl.rows?.[ri]) || '第' + (ri + 1) + '行';
        rowErrors.forEach(err => { allErrors.push(rowTitle + ': ' + err); });
      }
      allD[ri] = rd;
    });

    if (!hasValue) {
      toastWarning('请先展开填报行并填写至少一项数据');
      return;
    }

    if (allErrors.length) {
      errorList.value = allErrors;
      showErrors.value = true;
      return;
    }

    const merged = { ...existing, ...allD };
    await dataStore.saveSubmission(tpl.id, cd, cu, merged);
    toastSuccess('✓ 提交成功！');
    dataStore.setCurrentFillUser('');
    filterOverride.value = null;
  } catch (_err) {
    console.error('提交失败:', _err);
    toastWarning('提交失败，请重试');
  }
}

function getRowTitle(tpl: Template, row: Record<string, string> | undefined): string {
  if (!row) return '';
  const tfs = tpl.titleFields || [];
  if (!tfs.length) return '';
  return tfs.map(h => row[h] || '').filter(v => v.trim()).join(' · ') || '';
}
</script>

<style scoped>
/* 页面标题 */
.page-header {
  margin-bottom: var(--sp-5);
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

/* 移动端：上下结构，正常滚动 */
.fill-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 桌面端：sidebar fixed 在 260px，main fixed 在 640px，间距 40px */
@media (min-width: 768px) {
  .fill-layout {
    /* 不占流，纯定位容器 */
    height: calc(100vh - var(--sp-6) - var(--header-height) - var(--sp-6));
  }

  /* sidebar：fixed，距视口左边 260px */
  .fill-layout > *:first-child {
    position: fixed;
    top: calc(var(--header-height) + var(--sp-6));
    left: 260px;
    width: 340px;
    bottom: var(--sp-6);
    z-index: 10;
  }

  /* main：fixed，sidebar 右侧 + 40px 间距 */
  .fill-layout > *:nth-child(2) {
    position: fixed;
    top: calc(var(--header-height) + var(--sp-6));
    left: 640px;
    bottom: var(--sp-6);
    right: 0;
    overflow-y: auto;
    min-height: 0;
    z-index: 5;
  }
}

@media (min-width: 1024px) {
  .fill-layout > *:first-child {
    width: 380px;
  }
  .fill-layout > *:nth-child(2) {
    left: 680px;
  }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--tm);
}

.empty-icon {
  font-size: 56px;
  margin-bottom: var(--sp-4);
  display: block;
}

.tpl-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-3);
}

@media (min-width: 768px) {
  .tpl-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 1200px) {
  .tpl-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.tpl-card {
  background: var(--sf);
  border: 1px solid var(--b);
  border-radius: var(--rl);
  padding: 22px;
  cursor: pointer;
  transition: all 0.25s;
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.tpl-card:hover {
  border-color: var(--p);
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
}

.tpl-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient);
  opacity: 0;
  transition: opacity 0.25s;
}

.tpl-card:hover::before {
  opacity: 1;
}

.tpl-card-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--r);
  background: var(--gradient);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 14px;
  box-shadow: var(--shadow-sm);
}

.tpl-card-name {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--t);
}

.tpl-card-meta {
  font-size: 12px;
  color: var(--tm);
  display: flex;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.tpl-card-enter {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
  color: var(--p);
  opacity: 0;
  transition: opacity 0.25s;
}

.tpl-card:hover .tpl-card-enter {
  opacity: 1;
}
</style>
