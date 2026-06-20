<template>
  <div class="app-container">
    <AppHeader />
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
  background: var(--bg);
}

.app-main {
  padding: 20px 16px;
  padding-bottom: calc(var(--tab-bar-height) + 16px);
  animation: fade-in 0.3s ease;
}

@media (min-width: 768px) {
  .app-main {
    padding: 28px 24px;
    padding-bottom: calc(var(--tab-bar-height) + 20px);
  }
}

@media (min-width: 1024px) {
  .app-main {
    padding: 32px;
    padding-bottom: calc(var(--tab-bar-height) + 24px);
  }
}
</style>
