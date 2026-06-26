<template>
  <n-card size="small" :bordered="false" :style="cardStyle">
    <n-statistic :label="label" :value="value" :value-style="{ color }">
      <template #suffix v-if="suffix">
        <span style="font-size: 13px; color: var(--n-text-color-3)">{{ suffix }}</span>
      </template>
    </n-statistic>
  </n-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NCard, NStatistic } from 'naive-ui';

const props = defineProps<{
  label: string;
  value: string | number;
  color?: string;
  suffix?: string;
  borderColor?: string;
}>();

const cardStyle = computed(() => ({
  borderLeft: `3px solid ${props.borderColor || props.color || '#2563eb'}`,
  borderRadius: '8px',
}));
</script>
