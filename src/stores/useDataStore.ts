import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  AppData,
  Template,
  TemplateSubmissions,
  RowSubmission,
  ConnectionStatus,
} from '@/types';
import { useAuthStore } from './useAuthStore';

export const useDataStore = defineStore('data', () => {
  // ===== 核心状态（对应原 D 对象） =====
  const tpls = ref<Template[]>([]);
  const members = ref<Record<string, string[]>>({});
  const sub = ref<Record<string, TemplateSubmissions>>({});
  const serverConnected = ref(false);
  const connectionStatus = ref<ConnectionStatus>('loading');

  // ===== 当前激活的模板 =====
  const activeTemplateId = ref('');
  // ===== 当前填报人（填报页和历史页共享） =====
  const currentFillUser = ref('');
  const activeTemplate = computed<Template | null>(() => {
    if (!activeTemplateId.value) return null;
    return tpls.value.find(t => t.id === activeTemplateId.value) || null;
  });

  // ===== 计算属性 =====
  const allMembers = computed<string[]>(() => {
    const set = new Set<string>();
    if (members.value && typeof members.value === 'object') {
      Object.values(members.value).forEach(arr => {
        if (Array.isArray(arr)) arr.forEach(m => set.add(m));
      });
    }
    return [...set];
  });

  const totalRecords = computed(() => {
    let count = 0;
    Object.keys(sub.value).forEach(tid => {
      Object.keys(sub.value[tid] || {}).forEach(date => {
        count += Object.keys(sub.value[tid][date] || {}).length;
      });
    });
    return count;
  });

  // ===== 工具方法 =====
  function getTpl(id: string): Template | undefined {
    return tpls.value.find(t => t.id === id);
  }

  function getTplMembers(tplId: string): string[] {
    return members.value[tplId] || [];
  }

  function getTplSub(tplId: string): TemplateSubmissions {
    return sub.value[tplId] || {};
  }

  function setActiveTemplate(id: string) {
    activeTemplateId.value = id;
  }

  function setCurrentFillUser(user: string) {
    currentFillUser.value = user;
  }

  // ===== 内部：更新连接状态 =====
  function updateConnStatus(status: ConnectionStatus) {
    connectionStatus.value = status;
    serverConnected.value = status === 'ok';
  }

  // ===== 内部：兼容旧数据结构（对应原 ld() 中的兼容逻辑） =====
  function normalizeData(data: Partial<AppData>) {
    // 兼容旧的单模板结构
    if ((data as Record<string, unknown>).tpl && !data.tpls) {
      const tpl = (data as Record<string, unknown>).tpl as Template;
      data.tpls = [{ ...tpl, id: tpl.id || 'tpl_default' }];
    }
    if (!data.tpls) data.tpls = [];
    if (!data.sub) data.sub = {};

    // 兼容旧的 members 数组结构
    if (Array.isArray(data.members)) {
      const arr = data.members as unknown as string[];
      const newMembers: Record<string, string[]> = {};
      if (data.tpls.length) {
        data.tpls.forEach(t => { newMembers[t.id] = [...arr]; });
      } else {
        newMembers['0'] = arr;
      }
      data.members = newMembers;
    }
    if (!data.members || typeof data.members !== 'object') {
      data.members = {};
    }

    // 确保每个模板有 id 和 members
    data.tpls.forEach(t => {
      if (!t.id) t.id = 'tpl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      if (!data.members![t.id]) data.members![t.id] = [];
    });
  }

  // ===== 加载数据（对应原 ld()） =====
  async function loadData() {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '获取数据失败');

      const data = json.data as Partial<AppData>;
      normalizeData(data);

      tpls.value = data.tpls!;
      members.value = data.members!;
      sub.value = data.sub!;

      updateConnStatus('ok');
    } catch (_err) {
      console.error('加载数据失败:', _err);
      updateConnStatus('err');
      throw _err;
    }
  }

  // ===== 保存提交数据（对应原 svSub()） =====
  async function saveSubmission(
    tplId: string,
    date: string,
    user: string,
    submissions: Record<string, RowSubmission>
  ) {
    try {
      const res = await fetch('/api/submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tplId, date, user, submissions }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '保存失败');

      // 更新本地状态
      if (!sub.value[tplId]) sub.value[tplId] = {};
      if (!sub.value[tplId][date]) sub.value[tplId][date] = {};
      if (!sub.value[tplId][date][user]) sub.value[tplId][date][user] = {};
      Object.assign(sub.value[tplId][date][user], submissions);

      // 自动将用户加入成员列表
      if (!members.value[tplId]) members.value[tplId] = [];
      if (user && !members.value[tplId].includes(user)) {
        members.value[tplId].push(user);
        await saveMembers(tplId);
      }

      updateConnStatus('ok');
    } catch (err) {
      console.error('保存提交失败:', err);
      updateConnStatus('err');
      throw err;
    }
  }

  // ===== 保存模板（对应原 svTpl()） =====
  async function saveTemplate(tpl: Template, fieldRenames?: Record<string, string>) {
    try {
      const body: Record<string, unknown> = {
        name: tpl.name,
        columns: tpl.columns,
        rows: tpl.rows,
        filterField: tpl.filterField || '',
        titleFields: tpl.titleFields || [],
        rules: tpl.rules || [],
      };
      if (fieldRenames && Object.keys(fieldRenames).length) {
        body.fieldRenames = fieldRenames;
      }

      const res = await fetch('/api/template/' + tpl.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '保存模板失败');

      updateConnStatus('ok');
    } catch (_err) {
      console.error('保存模板失败:', _err);
      updateConnStatus('err');
      throw _err;
    }
  }

  // ===== 创建模板（对应原 API.createTemplate） =====
  async function createTemplate(tpl: Template, source?: string) {
    try {
      const res = await fetch('/api/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tpl.id,
          name: tpl.name,
          columns: tpl.columns,
          rows: tpl.rows,
          filterField: tpl.filterField || '',
          titleFields: tpl.titleFields || [],
          rules: tpl.rules || [],
          source: source || '',
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '创建模板失败');

      // 更新本地状态
      const existIdx = tpls.value.findIndex(t => t.id === tpl.id);
      if (existIdx >= 0) {
        tpls.value[existIdx] = tpl;
      } else {
        tpls.value.push(tpl);
      }
      if (!members.value[tpl.id]) members.value[tpl.id] = [];

      updateConnStatus('ok');
      return json;
    } catch (_err) {
      console.error('创建模板失败:', _err);
      updateConnStatus('err');
      throw _err;
    }
  }

  function createTemplateLocal(tpl: Template) {
    const existIdx = tpls.value.findIndex(t => t.id === tpl.id);
    if (existIdx >= 0) {
      tpls.value[existIdx] = tpl;
    } else {
      tpls.value.push(tpl);
    }
    if (!members.value[tpl.id]) members.value[tpl.id] = [];
  }

  // ===== 删除模板（对应原 API.deleteTemplate） =====
  async function deleteTemplate(tplId: string) {
    try {
      const res = await fetch('/api/template/' + tplId, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '删除模板失败');

      // 更新本地状态
      tpls.value = tpls.value.filter(t => t.id !== tplId);
      delete sub.value[tplId];
      delete members.value[tplId];
      if (activeTemplateId.value === tplId) activeTemplateId.value = '';

      updateConnStatus('ok');
    } catch (_err) {
      console.error('删除模板失败:', _err);
      updateConnStatus('err');
      throw _err;
    }
  }

  // ===== 保存成员列表（对应原 svMembers()） =====
  async function saveMembers(tplId: string) {
    try {
      const list = members.value[tplId] || [];
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tplId, members: list }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '保存成员失败');

      updateConnStatus('ok');
    } catch (_err) {
      console.error('保存成员失败:', _err);
      updateConnStatus('err');
    }
  }

  // ===== 删除提交记录（对应原 API.deleteSubmission） =====
  async function deleteSubmission(tplId: string, date: string, user: string, rowIndex: number) {
    try {
      const params = new URLSearchParams({
        tplId,
        date,
        user,
        rowIndex: String(rowIndex),
      });
      const res = await fetch('/api/submission?' + params.toString(), { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '删除失败');

      // 更新本地状态
      if (sub.value[tplId]?.[date]?.[user]) {
        delete sub.value[tplId][date][user][String(rowIndex)];
        if (!Object.keys(sub.value[tplId][date][user]).length) {
          delete sub.value[tplId][date][user];
        }
        if (!Object.keys(sub.value[tplId][date]).length) {
          delete sub.value[tplId][date];
        }
      }

      updateConnStatus('ok');
    } catch (_err) {
      console.error('删除提交失败:', _err);
      updateConnStatus('err');
      throw _err;
    }
  }

  // ===== 重置所有数据（对应原 API.resetAll） =====
  async function resetAll(password: string): Promise<{ success: boolean; error?: string }> {
    const authStore = useAuthStore();
    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: authStore.authHeaders,
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (json.success) {
        tpls.value = [];
        members.value = {};
        sub.value = {};
        activeTemplateId.value = '';
      }
      return json;
    } catch (_err) {
      return { success: false, error: '请求失败' };
    }
  }

  return {
    // 状态
    tpls,
    members,
    sub,
    serverConnected,
    connectionStatus,
    activeTemplateId,
    currentFillUser,        // 新增
    // 计算属性
    activeTemplate,
    allMembers,
    totalRecords,
    // 工具方法
    getTpl,
    getTplMembers,
    getTplSub,
    setActiveTemplate,
    setCurrentFillUser,     // 新增
    updateConnStatus,
    // 数据操作
    loadData,
    saveSubmission,
    saveTemplate,
    createTemplate,
    createTemplateLocal,
    deleteTemplate,
    saveMembers,
    deleteSubmission,
    resetAll,
  };
});
