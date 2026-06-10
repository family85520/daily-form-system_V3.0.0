import api from './index';

/** 导出 CSV（返回下载 URL） */
export function getCsvExportUrl(tplId: string, date?: string, user?: string): string {
  const params = new URLSearchParams({ tplId });
  if (date) params.set('date', date);
  if (user) params.set('user', user);
  return `/api/export/csv?${params.toString()}`;
}

/** 导出 Excel（返回下载 URL） */
export function getExcelExportUrl(tplId: string, date?: string, user?: string): string {
  const params = new URLSearchParams({ tplId });
  if (date) params.set('date', date);
  if (user) params.set('user', user);
  return `/api/export/excel?${params.toString()}`;
}

/** 重置所有数据 */
export async function resetAll(password: string) {
  const res = await api.post('/reset', { password });
  return res.data;
}
