<template>
  <div>
    <div class="admin-cd">
      <div class="cd-title">📥 管理员导出</div>
      <div class="form-group">
        <label class="form-label">选择模板 <span style="color: var(--d);">*</span></label>
        <select class="form-select" v-model="selTplId" @change="onTplChange">
          <option value="">-- 请选择模板 --</option>
          <option v-for="t in dataStore.tpls" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">选择日期</label>
        <select class="form-select" v-model="selDate">
          <option value="">全部日期</option>
          <option v-for="d in dates" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">选择填报人</label>
        <select class="form-select" v-model="selUser">
          <option value="">全部填报人</option>
          <option v-for="u in users" :key="u" :value="u">{{ u }}</option>
        </select>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="btn btn-primary" style="flex: 1;" @click="onExport('csv')">📄 导出 CSV</button>
        <button class="btn btn-info" style="flex: 1;" @click="onExport('excel')">📊 导出 Excel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDataStore } from '@/stores/useDataStore';
import { useToast } from '@/composables/useToast';

const dataStore = useDataStore();
const { toastWarning } = useToast();

const selTplId = ref('');
const selDate = ref('');
const selUser = ref('');

const tplSub = computed(() => dataStore.sub[selTplId.value] || {});
const dates = computed(() => Object.keys(tplSub.value).sort().reverse());

const users = computed(() => {
  const result: string[] = [];
  const sub = tplSub.value;
  const datesToCheck = selDate.value ? [selDate.value] : Object.keys(sub);
  datesToCheck.forEach(date => { const daySub = sub[date] || {}; Object.keys(daySub).forEach(u => { if (!result.includes(u)) result.push(u); }); });
  return result.sort();
});

function onTplChange() { selDate.value = ''; selUser.value = ''; }

function onExport(type: string) {
  if (!selTplId.value) { toastWarning('请先选择模板'); return; }
  const url = '/api/export/' + type + '?tplId=' + encodeURIComponent(selTplId.value) + '&date=' + encodeURIComponent(selDate.value) + (selUser.value ? '&user=' + encodeURIComponent(selUser.value) : '');
  window.open(url, '_blank');
}
</script>

<style scoped>
.admin-cd { background: var(--sf); border: 1px solid var(--b); border-radius: var(--rl); padding: 20px; margin-bottom: 16px; }
.cd-title { font-size: 14px; font-weight: 600; margin-bottom: 16px; color: var(--t); }
.form-group { margin-bottom: 12px; }
.form-label { font-size: 13px; color: var(--ts); font-weight: 500; display: block; margin-bottom: 4px; }
.form-select { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--r); font-size: 13px; font-family: inherit; color: var(--t); background: var(--sf); background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; -webkit-appearance: none; appearance: none; outline: none; }
.form-select:focus { border-color: var(--p); }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 18px; border: 1px solid transparent; border-radius: var(--r); font-size: 14px; font-family: inherit; font-weight: 500; cursor: pointer; transition: all 0.15s; min-height: 40px; line-height: 1.3; background: none; outline: none; }
.btn-primary { background: var(--p); color: #fff; border-color: var(--p); }
.btn-info { background: var(--a); color: #fff; border-color: var(--a); }
:host {
  padding-bottom: 70px;
}
</style>
