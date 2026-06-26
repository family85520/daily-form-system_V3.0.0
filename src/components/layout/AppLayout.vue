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
  padding: var(--sp-6) var(--sp-8);
  padding-top: calc(var(--header-height) + var(--sp-6));
  padding-bottom: var(--sp-6);
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
    padding: var(--sp-4);
    padding-top: calc(var(--header-height) + var(--sp-4));
    padding-bottom: calc(var(--tab-bar-height) + var(--sp-4));
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .app-main {
    margin-left: var(--sidebar-width);
    padding: var(--sp-5) var(--sp-6);
    padding-top: calc(var(--header-height) + var(--sp-5));
  }
}

@media (min-width: 1024px) {
  .app-main {
    margin-left: var(--sidebar-width);
    padding: var(--sp-7) var(--sp-8);
    padding-top: calc(var(--header-height) + var(--sp-7));
  }
}
</style>
