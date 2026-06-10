import api from './index';

/** 获取全部数据（模板 + 提交 + 成员） */
export async function getData() {
  const res = await api.get('/data');
  return res.data;
}
