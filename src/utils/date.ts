// src/utils/date.ts
// 日期工具函数 — 统一日期标准化逻辑

/**
 * 标准化日期字符串：YYYY/MM/DD → YYYY-MM-DD
 * 如果标准化后不符合 YYYY-MM-DD 格式，返回空字符串
 * 注意：浏览器占位符文本（如 "yyyy/mm/日"）会被视为无效并返回 ''
 * 调用方如需特殊处理占位符，应在调用后自行判断
 * @param val 原始日期字符串
 * @returns 标准化后的日期字符串，或空字符串
 */
export function normalizeDate(val: string | number | undefined | null): string {
  if (val == null || val === '') return '';
  const raw = String(val);
  const normalized = raw.replace(/\//g, '-');
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : '';
}

/**
 * 判断字符串是否为合法的 YYYY-MM-DD 日期格式
 */
export function isValidDate(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

/**
 * 获取当前日期的 YYYY-MM-DD 字符串
 */
export function getCurrentDate(): string {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}
