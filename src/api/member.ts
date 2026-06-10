import api from './index';

/** 保存成员列表 */
export async function saveMembers(tplId: string, members: string[]) {
  const res = await api.post('/members', { tplId, members });
  return res.data;
}
