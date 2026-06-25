<template>
  <n-card size="small" :bordered="false" :style="{ borderRadius: '10px' }">
    <n-space align="center" wrap :size="[12, 8]">
      <slot />
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { NCard, NSpace } from 'naive-ui';
</script>
