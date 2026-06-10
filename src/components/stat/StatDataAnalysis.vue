<template>
  <div>
    <!-- 子 tab 切换 -->
    <div class="analysis-tabs">
      <button
        :class="['analysis-tab', { active: subTab === 'num' }]"
        @click="subTab = 'num'"
      >🔢 数值统计</button>
      <button
        :class="['analysis-tab', { active: subTab === 'detail' }]"
        @click="subTab = 'detail'"
      >📋 数据明细</button>
    </div>

    <NumFieldStats v-if="subTab === 'num'" :tpl-id="tplId" />
    <DataDetailTable v-if="subTab === 'detail'" :tpl-id="tplId" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import NumFieldStats from '@/components/stat/NumFieldStats.vue';
import DataDetailTable from '@/components/stat/DataDetailTable.vue';

defineProps<{ tplId: string }>();

const subTab = ref('num');
</script>

<style scoped>
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
</style>
