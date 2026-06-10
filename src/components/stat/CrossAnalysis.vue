<template>
  <div class="cross-analysis-wrap">
    <CrossStatConfig
      :tpl-id="tplId"
      @update:config="onConfigUpdate"
    />

    <CrossStatTable
      v-if="config"
      :config="config"
      :tpl-id="tplId"
    />

    <div v-else class="admin-cd empty-hint">
      请先配置维度和指标，然后点击"生成交叉表"
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import CrossStatConfig from '@/components/stat/CrossStatConfig.vue';
import CrossStatTable from '@/components/stat/CrossStatTable.vue';

defineProps<{ tplId: string }>();

export interface CrossStatConfigData {
  rowDims: string[];
  colDims: string[];
  metrics: { field: string; func: string }[];
  dateFrom: string;
  dateTo: string;
  selMember: string;
}

const config = ref<CrossStatConfigData | null>(null);

function onConfigUpdate(c: CrossStatConfigData) {
  config.value = c;
}
</script>

<style scoped>
.empty-hint {
  text-align: center;
  padding: 40px;
  color: var(--tm);
  font-size: 13px;
  background: var(--sf);
  border: 1px solid var(--b);
  border-radius: var(--rl);
}

.cross-analysis-wrap {
  padding-bottom: 80px;
}
</style>
