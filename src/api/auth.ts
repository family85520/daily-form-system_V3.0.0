import api from './index';

/** 验证管理员密码 */
export async function verifyPassword(password: string) {
  const res = await api.post('/verify', { password });
  return res.data;
}

/** 检查登录状态 */
export async function checkAuth() {
  const res = await api.get('/auth/check');
  return res.data;
}

/** 修改密码 */
export async function changePassword(oldPwd: string, newPwd: string) {
  const res = await api.post('/password', { oldPwd, newPwd });
  return res.data;
}

/** 退出登录 */
export async function logout() {
  const res = await api.post('/logout');
  return res.data;
}
