<template>
  <div class="app-container">
    <AppHeader>
      <template #selector>
        <slot name="header-selector" />
      </template>
    </AppHeader>

    <main class="app-main">
      <slot />
    </main>

    <AppTabBar />
  </div>
</template>

<script setup lang="ts">
import AppHeader from './AppHeader.vue';
import AppTabBar from './AppTabBar.vue';
</script>

<style scoped>
.app-container {
  max-width: var(--max-width);
  margin: 0 auto;
  min-height: 100vh;
  position: relative;
  padding-bottom: var(--tab-bar-height);
}

.app-main {
  padding: 20px;
}

@media (min-width: 768px) {
  .app-main {
    padding: 24px;
  }
}

@media (min-width: 1024px) {
  .app-main {
    padding: 28px 32px;
  }
}
</style>
