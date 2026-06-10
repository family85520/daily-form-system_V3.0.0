import api from './index';

/** 保存提交数据 */
export async function saveSubmission(
  tplId: string,
  date: string,
  user: string,
  submissions: Record<string, Record<string, string>>
) {
  const res = await api.post('/submission', { tplId, date, user, submissions });
  return res.data;
}

/** 删除提交记录 */
export async function deleteSubmission(
  tplId: string,
  date: string,
  user: string,
  rowIndex: number
) {
  const res = await api.delete('/submission', {
    params: { tplId, date, user, rowIndex },
  });
  return res.data;
}
