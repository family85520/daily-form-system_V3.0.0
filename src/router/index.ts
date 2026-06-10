import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/useAuthStore';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'fill',
    component: () => import('@/views/FillPage.vue'),
    meta: { requiresAuth: false, title: '填报' },
  },
  {
    path: '/history',
    name: 'history',
    component: () => import('@/views/HistoryPage.vue'),
    meta: { requiresAuth: false, title: '历史' },
  },
  {
    path: '/stat',
    name: 'stat',
    component: () => import('@/views/StatPage.vue'),
    meta: { requiresAuth: true, title: '统计' },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/AdminPage.vue'),
    meta: { requiresAuth: false, title: '管理' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫：统计/管理页面需要管理员验证
router.beforeEach((to, _from, next) => {
  if (to.meta.requiresAuth) {
    const authStore = useAuthStore();
    if (!authStore.isVerified) {
      // 未验证 → 跳转到管理页面进行密码验证
      // admin 页面本身不需要验证（它是验证入口）
      next({ name: 'admin' });
      return;
    }
  }
  next();
});

export default router;
