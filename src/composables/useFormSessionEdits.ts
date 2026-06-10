import { reactive } from 'vue';

// 模块级共享状态：记录用户在当前填报会话中主动编辑过的字段
// key 格式: "rowIndex:fieldHeader", value: 用户输入的值
const edits = reactive(new Map<string, string>());

export function useFormSessionEdits() {
  function recordEdit(ri: number, header: string, value: string) {
    edits.set(`${ri}:${header}`, value);
  }

  function getEditValue(ri: number, header: string): string | undefined {
    return edits.get(`${ri}:${header}`);
  }

  function hasEdit(ri: number, header: string): boolean {
    return edits.has(`${ri}:${header}`);
  }

  function clearAll() {
    edits.clear();
  }

  return { recordEdit, getEditValue, hasEdit, clearAll };
}
