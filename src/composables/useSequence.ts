import type { Template } from '@/types';
import { useDataStore } from '@/stores/useDataStore';

/**
 * 序列字段值计算
 *
 * 逻辑：遍历模板行 + 所有提交数据，取该字段的最大数值 + 1
 * 对应原 getNextSeqValue()
 */
export function useSequence() {
  const dataStore = useDataStore();

  /**
   * 计算序列字段的下一个值
   * @param tpl 模板
   * @param header 序列字段名
   * @returns 下一个序列值（字符串）
   */
  function getNextSeqValue(tpl: Template, header: string): string {
    if (!tpl || !tpl.rows || !tpl.rows.length) return '1';

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

    return String(maxVal + 1);
  }

  return { getNextSeqValue };
}
