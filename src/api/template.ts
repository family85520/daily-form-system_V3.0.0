import api from './index';

/** 创建模板 */
export async function createTemplate(tpl: {
  id: string;
  name: string;
  columns: unknown[];
  rows: unknown[];
  filterField?: string;
  titleFields?: string[];
  rules?: unknown[];
}) {
  const res = await api.post('/template', tpl);
  return res.data;
}

/** 更新模板 */
export async function updateTemplate(tplId: string, data: Record<string, unknown>) {
  const res = await api.put('/template/' + tplId, data);
  return res.data;
}

/** 删除模板 */
export async function deleteTemplate(tplId: string) {
  const res = await api.delete('/template/' + tplId);
  return res.data;
}
