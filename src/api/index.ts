import axios from 'axios';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDataStore } from '@/stores/useDataStore';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// 请求拦截器：自动附加 token
api.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (authStore.sessionToken) {
    config.headers['x-auth-token'] = authStore.sessionToken;
  }
  return config;
});

// 响应拦截器：统一处理 401 + 错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      try {
        const authStore = useAuthStore();
        authStore.logout();
        const dataStore = useDataStore();
        dataStore.updateConnStatus('err');
      } catch (_e) {
        // Pinia 尚未安装时静默忽略
      }
    }
    return Promise.reject(error);
  }
);

export default api;
