import type { Template, EffectiveRow, ValueSource } from '@/types';
import { useDataStore } from '@/stores/useDataStore';

/** 清除所有缓存（在数据重新加载后调用） */
export function clearInheritanceCache(): void {
  // 无缓存，空操作
}

/**
 * 行级数据继承逻辑
 *
 * 继承规则（不可变更）：
 *   1. 今日该行有任意数据 → 整行继承今日（空字段保持空）
 *   2. 无 → 找最近一次该行有任意数据的日期 → 整行继承（空字段保持空）
 *   3. 都无 → 整行继承基础数据
 *   4. 上次修改内容为空也属于"有内容"（已处理过的行不回退历史）
 *   5. 绝不允许单字段跨日期混合继承
 */
export function useInheritance() {
  const dataStore = useDataStore();

  /**
   * 批量计算所有行的有效值（带缓存）
   * 对应原 batchGetEffectiveRows()
   */
  function batchGetEffectiveRows(
    tpl: Template,
    forDate: string,
    forUser: string
  ): EffectiveRow[] {
    // 读取 dataStore.sub 建立响应式依赖（computed 追踪）
    void dataStore.sub;

    // 取出可编辑且包含的列
    const eCols = tpl.columns.filter(c => c.isEditable && c.included);
    const headers = eCols.map(c => c.header);
    const rowCount = tpl.rows ? tpl.rows.length : 0;
    const results: EffectiveRow[] = new Array(rowCount);

    // 初始化所有行为 empty
    for (let ri = 0; ri < rowCount; ri++) {
      const result: EffectiveRow = {};
      headers.forEach(h => { result[h] = { val: '', src: 'empty' }; });
      results[ri] = result;
    }

    // ===== 第一轮：今日数据 =====
    // 判断依据：该行在今日提交记录中存在（即使全空），说明用户已处理过该行
    const todayData = ((dataStore.sub[tpl.id] || {})[forDate] || {})[forUser] || {};
    const todaySubmitted: Record<number, boolean> = {};

    for (const ri in todayData) {
      const row = todayData[ri];
      if (!row) continue;
      const idx = parseInt(ri);
      if (idx >= rowCount || !results[idx]) continue;
      todaySubmitted[idx] = true;
      // 非空值标记为 today，空值保持 empty 但不再回退历史
      headers.forEach(h => {
        if (row[h] !== undefined && row[h] !== '') {
          results[idx][h] = { val: row[h], src: 'today' };
        }
      });
    }

    // ===== 第二轮：历史数据（行级继承） =====
    // 找到最近一次该行有任意数据的日期，整行继承（不混合跨日期）
    const tplSub = dataStore.sub[tpl.id] || {};
    const sortedDates = Object.keys(tplSub).sort().reverse();
    const rowHandled: Record<number, boolean> = {};

    for (let di = 0; di < sortedDates.length; di++) {
      const d = sortedDates[di];
      if (d >= forDate) continue;
      const ud = ((tplSub[d] || {})[forUser] || {});
      for (const ri in ud) {
        const row = ud[ri];
        if (!row) continue;
        if (typeof row !== 'object') continue;
        const idx = parseInt(ri);
        if (idx >= rowCount || !results[idx]) continue;
        // 只处理今日未提交的行（今日已提交的行即使全空也不回退历史）
        if (todaySubmitted[idx]) continue;
        // 已从更近日期继承过的行不再处理（防止跨日期混合）
        if (rowHandled[idx]) continue;
        // 检查该行是否有任意非空字段
        const hasAnyValue = headers.some(h => row[h] !== undefined && row[h] !== '');
        if (!hasAnyValue) continue;
        // 标记该行已处理
        rowHandled[idx] = true;
        // 整行继承：有值的字段标记 prev，空字段保持 empty
        const r = results[idx];
        headers.forEach(h => {
          if (row[h] !== undefined && row[h] !== '') {
            r[h] = { val: row[h], src: 'prev' };
          }
        });
      }
    }

    // ===== 第三轮：基础数据 =====
    // 今日和历史都未处理过的行，继承基础数据
    if (tpl.rows) {
      for (let ri = 0; ri < rowCount; ri++) {
        const baseRow = tpl.rows[ri];
        if (!baseRow) continue;
        const r = results[ri];
        if (todaySubmitted[ri]) continue;
        // 检查是否有任何字段来自历史
        const hasPrev = headers.some(h => r[h].src === 'prev');
        if (hasPrev) continue;
        // 还需检查：该行是否在历史提交中存在（即使值为空）
        let rowHandledInHistory = false;
        for (let di = 0; di < sortedDates.length; di++) {
          const d2 = sortedDates[di];
          if (d2 >= forDate) continue;
          const ud2 = ((tplSub[d2] || {})[forUser] || {});
          if (ri in ud2) { rowHandledInHistory = true; break; }
        }
        if (rowHandledInHistory) continue;
        // 真正无历史记录的行，继承基础数据
        headers.forEach(h => {
          const bv = baseRow[h];
          if (bv !== undefined && bv !== '') {
            r[h] = { val: bv, src: 'base' };
          }
        });
      }
    }

    return results;
  }

  /**
   * 单行有效值（委托 batchGetEffectiveRows）
   * 对应原 getEffectiveRowAll()
   */
  function getEffectiveRowAll(
    tpl: Template,
    ri: number,
    forDate: string,
    forUser: string
  ): EffectiveRow {
    const all = batchGetEffectiveRows(tpl, forDate, forUser);
    return all[ri] || {};
  }

  /**
   * 单字段有效值（委托 batchGetEffectiveRows）
   * 对应原 getEffectiveVal()
   */
  function getEffectiveVal(
    tpl: Template,
    ri: number,
    header: string,
    forDate: string,
    forUser: string
  ): { val: string; src: ValueSource } {
    const row = getEffectiveRowAll(tpl, ri, forDate, forUser);
    return row[header] || { val: '', src: 'empty' };
  }

  /**
   * 检查昨日是否有数据
   * 对应原 hasPrevData()
   */
  function hasPrevData(tpl: Template, forDate: string, forUser: string): boolean {
    // 计算昨日日期
    const d = new Date(forDate);
    d.setDate(d.getDate() - 1);
    const prevDate = d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');

    const ps = ((dataStore.sub[tpl.id] || {})[prevDate] || {})[forUser];
    if (!ps) return false;
    return Object.keys(ps).some(ri => ps[ri] && typeof ps[ri] === 'object');
  }

  /**
   * 检查今日是否有数据
   * 对应原 hasTodayData()
   */
  function hasTodayData(tpl: Template, forDate: string, forUser: string): boolean {
    const ts = ((dataStore.sub[tpl.id] || {})[forDate] || {})[forUser];
    if (!ts) return false;
    return Object.keys(ts).some(ri => ts[ri] && typeof ts[ri] === 'object');
  }

  return {
    batchGetEffectiveRows,
    getEffectiveRowAll,
    getEffectiveVal,
    hasPrevData,
    hasTodayData,
  };
}
