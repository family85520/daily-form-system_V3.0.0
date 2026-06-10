import { ref } from 'vue';

/**
 * Loading 状态管理
 * 对应原代码中的 showLoading() / hideLoading()
 */

const isVisible = ref(false);
const loadingText = ref('加载中...');

export function useLoading() {
  function showLoading(text: string = '加载中...') {
    loadingText.value = text;
    isVisible.value = true;
  }

  function hideLoading() {
    isVisible.value = false;
  }

  return {
    isVisible,
    loadingText,
    showLoading,
    hideLoading,
  };
}
