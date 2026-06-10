<template>
  <div>
    <div class="admin-cd">
      <div class="cd-title">🔗 一键下发</div>
      <p style="font-size: 13px; color: var(--ts); margin-bottom: 12px;">
        将链接发送给填报人员，打开即可选择模板填报
      </p>
      <div class="share-link">{{ shareUrl }}</div>
      <button class="btn btn-sm btn-primary" @click="copyLink">📋 复制链接</button>
    </div>

    <div class="admin-cd">
      <div class="cd-title">📋 模板与填报人</div>
      <div v-if="!dataStore.tpls.length" style="font-size: 13px; color: var(--tm); text-align: center; padding: 20px;">
        暂无模板，请先导入
      </div>
      <div v-else>
        <div v-for="tpl in dataStore.tpls" :key="tpl.id" class="tpl-overview-item">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <div class="tpl-icon">{{ (tpl.name || '?').charAt(0) }}</div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 13px; font-weight: 500;">{{ tpl.name }}</div>
              <div style="font-size: 11px; color: var(--tm);">
                {{ tpl.rows ? tpl.rows.length : 0 }}行 · {{ tpl.columns ? tpl.columns.filter(c => c.isEditable && c.included).length : 0 }}可填
              </div>
            </div>
          </div>
          <div style="padding-left: 38px; font-size: 12px; color: var(--ts);">
            👥 {{ getMembersText(tpl.id) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDataStore } from '@/stores/useDataStore';
import { useToast } from '@/composables/useToast';

const dataStore = useDataStore();
const { toastSuccess } = useToast();

const shareUrl = computed(() => window.location.origin);

function getMembersText(tplId: string): string {
  const members = dataStore.getTplMembers(tplId);
  return members.length ? members.join('、') : '暂无成员';
}

function copyLink() {
  const text = shareUrl.value;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => toastSuccess('✓ 链接已复制'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toastSuccess('✓ 链接已复制');
  }
}
</script>

<style scoped>
.admin-cd {
  background: var(--sf);
  border: 1px solid var(--b);
  border-radius: var(--rl);
  padding: 20px;
  margin-bottom: 16px;
}

.cd-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--t);
}

.share-link {
  background: var(--bl);
  border: 1px solid var(--b);
  border-radius: var(--r);
  padding: 12px 14px;
  font-size: 14px;
  word-break: break-all;
  margin-bottom: 14px;
  color: var(--p);
  font-family: monospace;
}

.tpl-overview-item {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--bl);
}

.tpl-overview-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.tpl-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--pl);
  color: var(--p);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 18px;
  border: 1px solid transparent;
  border-radius: var(--r);
  font-size: 14px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 40px;
  line-height: 1.3;
  background: none;
  outline: none;
}

.btn-primary {
  background: var(--p);
  color: #fff;
  border-color: var(--p);
}

.btn-primary:hover {
  background: var(--p2);
}

.btn-sm {
  padding: 6px 14px;
  font-size: 12px;
  min-height: 32px;
}

:host {
  padding-bottom: 70px;
}
</style>
