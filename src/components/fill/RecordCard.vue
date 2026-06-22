<template>
  <div
    :id="'row_' + rowIndex"
    :class="['record-card', statusClass, { expanded: expanded }]"
  >
    <div class="card-header" @click="toggle">
      <div class="card-title-area">
        <div class="card-title">
          {{ title }}
          <span :class="['status-tag', statusTagClass]">{{ statusText }}</span>
        </div>
        <div v-if="summary" class="card-summary">{{ summary }}</div>
        <div v-else-if="subtitle" class="card-summary">{{ subtitle }}</div>
      </div>
      <span class="card-arrow">▼</span>
    </div>

    <div class="card-progress">
      <span>今日 {{ filledToday }}/{{ totalEditable }}</span>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <n-button text type="primary" size="tiny" @click.stop="onQuickFill">快速填写</n-button>
      <n-button text type="error" size="tiny" @click.stop="onResetRow">重置</n-button>
    </div>

    <div class="card-body">
      <RecordForm
        v-if="expanded"
        :template="template"
        :row-index="rowIndex"
        :row="row"
        :current-user="currentUser"
        :current-date="currentDate"
        :effective-values="effectiveValues"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Template, EffectiveRow } from '@/types';
import { useDataStore } from '@/stores/useDataStore';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import RecordForm from './RecordForm.vue';

const props = defineProps<{
  template: Template;
  rowIndex: number;
  row: Record<string, string>;
  currentUser: string;
  currentDate: string;
  userData: Record<string, Record<string, string>>;
  effectiveValues: EffectiveRow[];
  forceExpand: boolean | null;
}>();

const emit = defineEmits<{
  refresh: [];
  'reset-row': [ri: number];
  'open-quick-fill': [rowIndex: number];
}>();

const dataStore = useDataStore();
const { confirmModal } = useConfirm();
const { toastSuccess } = useToast();

const expanded = ref(false);
watch(() => props.forceExpand, (val) => {
  if (val === true) expanded.value = true;
  else if (val === false) expanded.value = false;
});

const editableCols = computed(() =>
  props.template.columns.filter(c => c.isEditable && c.included)
);

const effectiveRow = computed(() =>
  props.effectiveValues[props.rowIndex] || {}
);

const filledToday = computed(() => {
  let count = 0;
  editableCols.value.forEach(c => {
    const ev = effectiveRow.value[c.header];
    if (ev && ev.src === 'today') count++;
  });
  return count;
});

const totalEditable = computed(() => editableCols.value.length);

const progressPercent = computed(() =>
  totalEditable.value ? Math.round(filledToday.value / totalEditable.value * 100) : 0
);

const statusClass = computed(() => {
  if (filledToday.value === totalEditable.value) return 'done';
  if (filledToday.value > 0) return 'part';
  const hasInherit = editableCols.value.some(c => effectiveRow.value[c.header]?.src === 'prev');
  if (hasInherit) return 'inherit';
  return 'empty';
});

const statusTagClass = computed(() => {
  if (filledToday.value === totalEditable.value) return 'tag-ok';
  if (filledToday.value > 0) return 'tag-warn';
  const hasInherit = editableCols.value.some(c => effectiveRow.value[c.header]?.src === 'prev');
  if (hasInherit) return 'tag-info';
  return 'tag-error';
});

const statusText = computed(() => {
  if (filledToday.value === totalEditable.value) return '✓ 已完成';
  if (filledToday.value > 0) return '✏️ ' + filledToday.value + '/' + totalEditable.value;
  const hasInherit = editableCols.value.some(c => effectiveRow.value[c.header]?.src === 'prev');
  if (hasInherit) return '📥 已继承';
  return '未填';
});

const title = computed(() => {
  const tfs = props.template.titleFields || [];
  if (!tfs.length) return '第' + (props.rowIndex + 1) + '项';

  const ev = props.effectiveValues[props.rowIndex] || {};

  return tfs.map(h => {
    const effective = ev[h];
    if (effective && effective.val) return effective.val;
    return (props.row[h] || '').trim();
  }).filter(v => v).join(' · ') || '第' + (props.rowIndex + 1) + '项';
});

const subtitle = computed(() => {
  const fCols = props.template.columns.filter(c => !c.isEditable && c.included);
  const tfs = props.template.titleFields || [];
  return fCols
    .filter(c => !tfs.includes(c.header))
    .map(c => props.row[c.header] || '')
    .filter(v => v.trim())
    .join(' · ');
});

const summary = computed(() => {
  const firstE = editableCols.value[0];
  if (!firstE) return '';
  const firstV = effectiveRow.value[firstE.header];
  if (!firstV || !firstV.val) return '';
  const sl = firstV.src === 'today' ? '✏️' : firstV.src === 'prev' ? '📥' : '📊';
  return sl + ' ' + firstV.val;
});

function toggle() {
  expanded.value = !expanded.value;
}

function onQuickFill() {
  emit('open-quick-fill', props.rowIndex);
}

function onResetRow() {
  confirmModal('确定要重置该行数据为基础数据吗？', async () => {
    const tpl = props.template;
    const ri = props.rowIndex;
    const cd = props.currentDate;
    const cu = props.currentUser;
    const eCols = tpl.columns.filter(c => c.isEditable && c.included);
    const baseRow = (tpl.rows && tpl.rows[ri]) ? tpl.rows[ri] : {};
    const rd: Record<string, string> = {};
    eCols.forEach(c => { rd[c.header] = baseRow[c.header] || ''; });
    if (!dataStore.sub[tpl.id]) dataStore.sub[tpl.id] = {};
    if (!dataStore.sub[tpl.id][cd]) dataStore.sub[tpl.id][cd] = {};
    if (!dataStore.sub[tpl.id][cd][cu]) dataStore.sub[tpl.id][cd][cu] = {};
    dataStore.sub[tpl.id][cd][cu][String(ri)] = rd;
    await dataStore.saveSubmission(tpl.id, cd, cu, { [String(ri)]: rd });
    toastSuccess('✓ 已重置为基础数据');
    emit('refresh');
  });
}
</script>

<style scoped>
.record-card {
  background: var(--sf);
  border: 1px solid var(--b);
  border-radius: var(--rl);
  margin-bottom: 12px;
  overflow: hidden;
  border-left: 4px solid var(--b);
  transition: all 0.25s;
  box-shadow: var(--shadow-sm);
}

.record-card:hover {
  box-shadow: var(--shadow);
  transform: translateY(-1px);
}

.record-card.done { border-left-color: var(--ok); }
.record-card.part { border-left-color: var(--w); }
.record-card.empty { border-left-color: var(--tm); }
.record-card.inherit { border-left-color: var(--p); }

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.card-header:hover { background: var(--bl); }

.card-title-area { flex: 1; min-width: 0; }

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--t);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-summary {
  font-size: 12px;
  color: var(--tm);
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-arrow {
  font-size: 12px;
  color: var(--tm);
  transition: transform 0.25s;
  flex-shrink: 0;
  margin-left: 8px;
}

.record-card.expanded .card-arrow { transform: rotate(180deg); }

.status-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--r-pill);
  font-size: 11px;
  font-weight: 600;
  margin-left: 8px;
}

.tag-ok { background: var(--okl); color: var(--ok); }
.tag-warn { background: var(--wl); color: var(--w); }
.tag-error { background: var(--dl); color: var(--d); }
.tag-info { background: var(--pl); color: var(--p); }

.card-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--bl);
  font-size: 12px;
  color: var(--tm);
  border-top: 1px solid var(--b);
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--b);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--gradient);
  border-radius: 3px;
  transition: width 0.3s;
}

.card-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.record-card.expanded .card-body { max-height: 3000px; }
</style>
