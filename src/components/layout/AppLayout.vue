<template>
  <div class="app-container">
    <AppHeader />
    <SidebarNav />
    <main class="app-main">
      <slot />
    </main>
    <AppTabBar />
  </div>
</template>

<script setup lang="ts">
import AppHeader from './AppHeader.vue';
import SidebarNav from './SidebarNav.vue';
import AppTabBar from './AppTabBar.vue';
</script>

<style scoped>
.app-container {
  max-width: 100%;
  min-height: 100vh;
  position: relative;
  background: var(--bg);
}

.app-main {
  margin-left: var(--sidebar-width);
  padding: 24px 28px;
  padding-top: calc(var(--header-height) + 24px);
  padding-bottom: 24px;
  min-height: 100vh;
  animation: fade-in 0.3s ease;
}

@media (max-width: 767px) {
  .app-main {
    margin-left: 0;
    padding: 16px;
    padding-top: calc(var(--header-height) + 16px);
    padding-bottom: calc(var(--tab-bar-height) + 16px);
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .app-main {
    margin-left: var(--sidebar-width);
    padding: 20px 24px;
    padding-top: calc(var(--header-height) + 20px);
  }
}

@media (min-width: 1024px) {
  .app-main {
    margin-left: var(--sidebar-width);
    padding: 28px 32px;
    padding-top: calc(var(--header-height) + 28px);
  }
}
</style>
