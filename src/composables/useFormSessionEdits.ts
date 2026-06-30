import { reactive } from 'vue';

// 模块级共享状态：记录用户在当前填报会话中主动编辑过的字段
// key 格式: "userId:rowIndex:fieldHeader"，value: 用户输入的值
// 包含 userId 以避免切换用户时编辑记录交叉污染
const edits = reactive(new Map<string, string>());

export function useFormSessionEdits() {
  /**
   * 记录用户编辑
   * @param userId 填报人用户名（用于隔离不同用户的编辑记录）
   * @param ri 行索引
   * @param header 字段名
   * @param value 用户输入的值
   */
  function recordEdit(userId: string, ri: number, header: string, value: string) {
    edits.set(`${userId}:${ri}:${header}`, value);
  }

  /**
   * 获取用户编辑的值
   */
  function getEditValue(userId: string, ri: number, header: string): string | undefined {
    return edits.get(`${userId}:${ri}:${header}`);
  }

  /**
   * 检查用户是否编辑过某字段
   */
  function hasEdit(userId: string, ri: number, header: string): boolean {
    return edits.has(`${userId}:${ri}:${header}`);
  }

  /**
   * 清除所有编辑记录（切换用户/日期/模板时调用）
   */
  function clearAll() {
    edits.clear();
  }

  return { recordEdit, getEditValue, hasEdit, clearAll };
}
