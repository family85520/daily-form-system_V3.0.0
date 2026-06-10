import { createDiscreteApi } from 'naive-ui';
import { h } from 'vue';

/**
 * 确认弹窗封装
 * 使用 createDiscreteApi 创建独立实例，不依赖 n-dialog-provider
 */

let dialogApi: ReturnType<typeof createDiscreteApi>['dialog'] | null = null;

function getDialog() {
  if (!dialogApi) {
    const { dialog } = createDiscreteApi(['dialog']);
    dialogApi = dialog;
  }
  return dialogApi;
}

function msgToVNode(msg: string) {
  const lines = msg.split('\n');
  const children: ReturnType<typeof h>[] = [];
  lines.forEach((line, i) => {
    if (i > 0) children.push(h('br'));
    children.push(h('span', null, line));
  });
  return h('div', children);
}

export function useConfirm() {
  function confirmModal(
    msg: string,
    onOk: () => void,
    onCancel?: () => void
  ) {
    getDialog().warning({
      title: '确认操作',
      content: () => msgToVNode(msg),
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: () => { onOk(); },
      onNegativeClick: () => { if (onCancel) onCancel(); },
    });
  }

  function confirmDanger(
    msg: string,
    onOk: () => void,
    onCancel?: () => void
  ) {
    getDialog().error({
      title: '危险操作',
      content: () => msgToVNode(msg),
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: () => { onOk(); },
      onNegativeClick: () => { if (onCancel) onCancel(); },
    });
  }

  return { confirmModal, confirmDanger };
}
