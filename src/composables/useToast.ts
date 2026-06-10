import { createDiscreteApi } from 'naive-ui';
import { TOAST_DURATION } from '@/constants';

/**
 * Toast 提示封装
 * 使用 createDiscreteApi 创建独立实例，不依赖 n-message-provider
 */

let messageApi: ReturnType<typeof createDiscreteApi>['message'] | null = null;

function getMessage() {
  if (!messageApi) {
    const { message } = createDiscreteApi(['message']);
    messageApi = message;
  }
  return messageApi;
}

export function useToast() {
  function toast(msg: string, duration: number = TOAST_DURATION) {
    getMessage().info(msg, { duration });
  }

  function toastSuccess(msg: string, duration: number = TOAST_DURATION) {
    getMessage().success(msg, { duration });
  }

  function toastWarning(msg: string, duration: number = TOAST_DURATION) {
    getMessage().warning(msg, { duration });
  }

  function toastError(msg: string, duration: number = TOAST_DURATION) {
    getMessage().error(msg, { duration });
  }

  return { toast, toastSuccess, toastWarning, toastError };
}
