<template>
  <div class="app-container">
    <AppHeader>
      <template #selector>
        <slot name="header-selector" />
      </template>
    </AppHeader>
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
  position: relative;
  margin-left: var(--sidebar-width);
  padding: 24px 28px;
  padding-top: calc(var(--header-height) + 24px);
  padding-bottom: 24px;
  min-height: 100vh;
  animation: fade-in 0.3s ease;
  z-index: 1;
}

.app-main::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: radial-gradient(circle, rgba(0, 77, 64, 0.025) 1px, transparent 1px);
  background-size: 28px 28px;
  pointer-events: none;
  z-index: -1;
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
