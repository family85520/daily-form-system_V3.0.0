import type { Template } from '@/types';
import { useDataStore } from '@/stores/useDataStore';

// 模块级缓存：tplId:header → maxSeqValue
// 在 useDataStore 中更新，避免每次遍历所有提交数据
const seqCache = new Map<string, number>();

/**
 * 生成缓存 key
 */
function cacheKey(tplId: string, header: string): string {
  return `${tplId}::${header}`;
}

/**
 * 清除指定模板的序列缓存
 */
function clearCache(tplId: string): void {
  if (!tplId) {
    // 清空全部
    seqCache.clear();
  } else {
    for (const key of seqCache.keys()) {
      if (key.startsWith(tplId + '::')) {
        seqCache.delete(key);
      }
    }
  }
}

// 导出缓存管理函数
export { clearCache, cacheKey };

export function useSequence() {
  const dataStore = useDataStore();

  /**
   * 计算序列字段的下一个值
   * 优先使用缓存，缓存未命中时遍历计算并更新缓存
   */
  function getNextSeqValue(tpl: Template, header: string): string {
    if (!tpl || !tpl.rows || !tpl.rows.length) return '1';

    const key = cacheKey(tpl.id, header);
    const cached = seqCache.get(key);

    if (cached !== undefined) {
      return String(cached + 1);
    }

    // 缓存未命中，遍历计算
    let maxVal = 0;

    // 遍历模板基础数据行
    tpl.rows.forEach(row => {
      const v = row[header];
      if (v !== undefined && v !== null && v !== '') {
        const str = String(v).trim();
        if (/^\d+$/.test(str)) {
          const num = parseInt(str, 10);
          if (num > maxVal) maxVal = num;
        }
      }
    });

    // 遍历所有提交数据
    const tplSub = dataStore.sub[tpl.id] || {};
    Object.keys(tplSub).forEach(date => {
      const daySub = tplSub[date] || {};
      Object.keys(daySub).forEach(user => {
        const ud = daySub[user] || {};
        Object.keys(ud).forEach(ri => {
          const rd = ud[ri];
          if (rd && rd[header] !== undefined && rd[header] !== null && rd[header] !== '') {
            const str = String(rd[header]).trim();
            if (/^\d+$/.test(str)) {
              const num = parseInt(str, 10);
              if (num > maxVal) maxVal = num;
            }
          }
        });
      });
    });

    // 更新缓存
    seqCache.set(key, maxVal);

    return String(maxVal + 1);
  }

  /**
   * 更新序列缓存（在 saveSubmission 成功后调用）
   */
  function updateSeqCache(tplId: string, header: string, newValue: number): void {
    const key = cacheKey(tplId, header);
    const current = seqCache.get(key) ?? 0;
    if (newValue > current) {
      seqCache.set(key, newValue);
    }
  }

  /**
   * 清除指定模板的所有缓存
   */
  function invalidateTplCache(tplId: string): void {
    clearCache(tplId);
  }

  return { getNextSeqValue, updateSeqCache, invalidateTplCache };
}
