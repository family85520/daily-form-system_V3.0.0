<template>
  <div class="tpl-editor">
      <button class="btn btn-sm btn-ghost" @click="$emit('back')">←</button>
      <span style="font-size: 16px; font-weight: 600;">编辑模板</span>
    <div class="editor-header">
        <div v-if="isNewTpl" class="new-tpl-hint">
      ⚠️ 新建模板，请点击「💾 保存全部修改」保存到服务器
    </div>
      
    </div>

    <!-- 基本信息 -->
    <div class="admin-cd">
      <div class="cd-title">📋 基本信息</div>
      <div class="form-group">
        <label class="form-label">模板名称</label>
        <input class="form-input" v-model="editName" />
      </div>
      <div style="font-size: 12px; color: var(--tm);">
        {{ tpl?.rows?.length || 0 }} 行数据 · {{ fixedCols.length }} 固定列 · {{ editableCols.length }} 可填列
      </div>
    </div>

    <!-- 字段管理 -->
    <div class="admin-cd">
      <div class="cd-title">🔧 字段管理</div>
      <div style="font-size: 12px; color: var(--tm); margin-bottom: 12px;">
        <strong style="color: var(--a);">🔒固定</strong> 只读 ·
        <strong style="color: var(--w);">✏️可填</strong> 需填报 ·
        <strong style="color: var(--d);">*必填</strong>
      </div>
      <div v-if="hasDuplicate" class="dup-warning">
        <div style="font-size: 14px; font-weight: 600; color: var(--w); margin-bottom: 8px;">⚠️ 检测到重复字段名</div>
        <div style="font-size: 13px; color: var(--ts);">
          以下字段名存在重复：<strong style="color: var(--d);">{{ duplicateNames }}</strong>
        </div>
        <div style="font-size: 12px; color: var(--tm);">请修改字段名称后保存</div>
      </div>
      <div class="field-grid">
        <div v-for="(col, idx) in editColumns" :key="idx" class="field-card">
          <div class="field-card-header">
            <div class="field-num">{{ idx + 1 }}</div>
            <div class="field-name">{{ col.header }}</div>
            <button class="field-del" @click="removeField(idx)">×</button>
          </div>
          <div class="field-row">
            <span class="field-label">名称</span>
            <input class="form-input-sm" v-model="col.header" />
          </div>
          <div class="field-row">
            <span class="field-label">类型</span>
            <select class="form-select-sm" v-model="col.type" @change="onTypeChange(idx, col)">
              <option value="text">文本</option>
              <option value="number">数字</option>
              <option value="textarea">多行</option>
              <option value="select">下拉</option>
              <option value="date">日期</option>
              <option value="sequence">序列</option>
            </select>
          </div>
          <div v-if="col.type === 'select'" class="field-row">
            <span class="field-label">选项</span>
            <input class="form-input-sm" v-model="col._opts" placeholder="逗号分隔" />
          </div>
          <div class="field-toggles">
            <div class="field-toggle">
              <span>可填</span>
              <div :class="['switch', { on: col.isEditable }]" @click="col.isEditable = !col.isEditable"></div>
            </div>
            <div class="field-toggle">
              <span>必填</span>
              <div :class="['switch', { on: col.required }]" @click="col.required = !col.required"></div>
            </div>
          </div>
        </div>
      </div>
      <button class="btn btn-sm btn-ghost" style="margin-top: 8px;" @click="addField">➕ 添加字段</button>
    </div>

    <!-- 基础数据管理 -->
    <div v-if="tpl?.rows?.length" class="admin-cd">
      <div class="cd-title">📊 基础数据管理（{{ tpl.rows.length }}行）</div>
      <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center;">
        <span style="font-size: 12px; color: var(--tm); flex: 1;">
          可新增、修改或删除基础数据行，已填报的关联数据不受影响
        </span>
      </div>

      <!-- 搜索 + 操作栏 -->
      <div class="base-toolbar">
        <input class="form-input-sm" v-model="baseSearch" placeholder="🔍 搜索内容..." style="max-width: 200px;" />
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-info" @click="addBaseRow">➕ 新增</button>
          <button class="btn btn-sm btn-default" :disabled="!selectedRows.size" @click="deleteSelectedRows">
            🗑️ 删除选中{{ selectedRows.size ? ' (' + selectedRows.size + ')' : '' }}
          </button>
          <button class="btn btn-sm btn-default" style="color: var(--d);" @click="deleteAllRows">
            🗑️ 删除全部
          </button>
          <button class="btn btn-sm btn-default" @click="exportBaseData">📤 导出Excel</button>
          <button class="btn btn-sm btn-default" @click="baseImportInput?.click()">📥 导入替换</button>
        </div>
      </div>

      <!-- 表格 -->
      <div class="table-wrap" style="max-height: 400px;">
        <table>
          <thead>
            <tr>
              <th style="width: 36px;">
                <input type="checkbox" :checked="isAllSelected" @change="toggleAllRows" />
              </th>
              <th style="width: 40px;">#</th>
              <th v-for="c in allIncludedCols" :key="c.header">{{ c.header }}</th>
              <th style="width: 120px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ri in pagedRows" :key="ri">
              <td>
                <input type="checkbox" :checked="selectedRows.has(ri)" @change="toggleRow(ri)" />
              </td>
              <td style="font-weight: 600; color: var(--tm);">{{ ri + 1 }}</td>
              <td v-for="c in allIncludedCols" :key="c.header"
                :style="{ background: c.isEditable ? '#fefce8' : '#f1f3f5', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }">
                {{ (tpl!.rows![ri] || {})[c.header] || '' }}
              </td>
              <td style="white-space: nowrap;">
                <button class="btn btn-sm" style="padding: 2px 8px; font-size: 11px; background: var(--a); color: #fff; border-color: var(--a);"
                  @click="openEditRow(ri)">✏️</button>
                <button class="btn btn-sm" style="padding: 2px 8px; font-size: 11px; color: var(--d);"
                  @click="deleteBaseRow(ri)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="pager" v-if="filteredBaseRows.length > pageSize">
        <button class="btn btn-sm btn-ghost" @click="basePage = Math.max(0, basePage - 1)">◀</button>
        <span>{{ basePage + 1 }} / {{ totalPages }}</span>
        <button class="btn btn-sm btn-ghost" @click="basePage = Math.min(totalPages - 1, basePage + 1)">▶</button>
        <span style="margin-left: auto;">每页 {{ pageSize }} 行</span>
      </div>
    <!-- 编辑行弹窗 -->
    <BaseModal
      :show="showEditRow"
      :title="'编辑第 ' + (editRowIndex + 1) + ' 行'"
      max-width="560px"
      @close="showEditRow = false"
    >
      <div class="fill-form">
        <!-- 所有字段均可编辑（基础数据是源头数据） -->
        <div
          v-for="c in allIncludedCols"
          :key="c.header"
          :class="['fill-field', { 'fill-error': editRowErrors[c.header] }]"
        >
          <div class="fill-label">
            {{ c.header }}
            <span v-if="!c.isEditable" class="fill-tag">🔒固定</span>
            <span v-if="c.required" class="fill-required">*</span>
          </div>

          <!-- 文本/数字/日期 -->
          <input
            v-if="c.type === 'text' || c.type === 'number' || c.type === 'date' || c.type === 'sequence'"
            :id="'edit_' + c.header"
            class="fill-input"
            :type="c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : 'text'"
            v-model="editRowData[c.header]"
            :placeholder="c.constraints?.errorMessage || '请输入' + c.header"
          />

          <!-- 多行文本 -->
          <textarea
            v-else-if="c.type === 'textarea'"
            :id="'edit_' + c.header"
            class="fill-textarea"
            v-model="editRowData[c.header]"
            rows="3"
            :placeholder="'请输入' + c.header"
          ></textarea>

          <!-- 下拉选择 -->
          <select
            v-else-if="c.type === 'select'"
            :id="'edit_' + c.header"
            class="fill-select"
            v-model="editRowData[c.header]"
          >
            <option value="">请选择</option>
            <option v-for="opt in getSelectOpts(c)" :key="opt" :value="opt">{{ opt }}</option>
          </select>

          <!-- 默认文本 -->
          <input
            v-else
            :id="'edit_' + c.header"
            class="fill-input"
            type="text"
            v-model="editRowData[c.header]"
            :placeholder="'请输入' + c.header"
          />

          <!-- 校验错误提示 -->
          <div v-if="editRowErrors[c.header]" class="fill-error-msg">
            ⚠️ {{ editRowErrors[c.header] }}
          </div>
        </div>
      </div>

      <template #footer>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-default" style="flex: 1;" @click="showEditRow = false">取消</button>
          <button class="btn btn-primary" style="flex: 1;" @click="saveEditRow">💾 保存</button>
        </div>
      </template>
    </BaseModal>
    </div>

    <!-- 字段规则 -->
    <div class="admin-cd">
      <div class="cd-title">⚡ 字段规则</div>
      <div style="font-size: 12px; color: var(--tm); margin-bottom: 12px;">
        当 [A字段 满足条件] 时，对 [B字段 执行操作]。支持多值（竖线|分隔）和字段间比较。
      </div>

      <div v-if="editRules.length" style="margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
          <span style="font-size: 12px; color: var(--ts);">
            共 {{ editRules.length }} 条规则，{{ activeRulesCount }} 条生效中
          </span>
          <button class="btn btn-sm btn-ghost" style="margin-left: auto; padding: 3px 10px; font-size: 11px;"
            @click="toggleAllRules">
            {{ allDisabled ? '全部启用' : '全部禁用' }}
          </button>
        </div>
        <div v-for="(rule, idx) in editRules" :key="idx" class="rule-item"
          :style="{ opacity: rule.disabled ? '0.45' : '1' }">
          <button :class="['btn', 'btn-sm', rule.disabled ? 'btn-ghost' : 'btn-ok']"
            style="padding: 3px 8px; font-size: 11px;"
            @click="rule.disabled = !rule.disabled">
            {{ rule.disabled ? '⬜' : '✅' }}
          </button>
          <span :class="['tag', getActionTagClass(rule.action?.type || '')]">
            {{ getActionLabel(rule.action?.type || '') }}
          </span>
          <span style="flex: 1; font-size: 13px;">{{ getRuleDesc(rule) }}</span>
          <span v-if="rule.disabled" style="font-size: 10px; color: var(--tm); font-weight: 500;">已禁用</span>
          <button class="btn btn-sm btn-default" style="padding: 3px 8px; font-size: 11px; color: var(--d);"
            @click="editRules.splice(idx, 1)">🗑️</button>
        </div>
      </div>

      <div class="rule-form">
        <div style="font-size: 12px; font-weight: 600; margin-bottom: 8px; color: var(--a);">📌 条件（当...）</div>
        <div class="rule-row">
          <span class="rule-label">当</span>
          <select class="form-select-sm" v-model="ruleForm.condField">
            <option value="">选择字段</option>
            <option v-for="c in allIncludedCols" :key="c.header" :value="c.header">{{ c.header }}</option>
          </select>
          <select class="form-select-sm" v-model="ruleForm.condOp">
            <option value="equals">等于（支持多值）</option>
            <option value="not_equals">不等于（支持多值）</option>
            <option value="greater_than">大于</option>
            <option value="less_than">小于</option>
            <option value="greater_equal">大于等于</option>
            <option value="less_equal">小于等于</option>
            <option value="between">介于</option>
            <option value="contains">包含（支持多值）</option>
            <option value="not_contains">不包含（支持多值）</option>
            <option value="is_empty">为空</option>
            <option value="is_not_empty">不为空</option>
          </select>
        </div>
        <div v-if="!['is_empty', 'is_not_empty'].includes(ruleForm.condOp)" class="rule-row">
          <select class="form-select-sm" v-model="ruleForm.condValType" style="flex: 0 0 80px;">
            <option value="value">值</option>
            <option value="field">字段</option>
          </select>
          <input v-if="ruleForm.condValType === 'value'" class="form-input-sm" v-model="ruleForm.condVal"
            placeholder="输入值（多值用竖线分隔）" />
          <select v-else class="form-select-sm" v-model="ruleForm.condValField">
            <option value="">选择字段</option>
            <option v-for="c in allIncludedCols" :key="c.header" :value="c.header">{{ c.header }}</option>
          </select>
        </div>

        <div style="border-top: 1px dashed var(--border); margin: 8px 0 12px;"></div>

        <div style="font-size: 12px; font-weight: 600; margin-bottom: 8px; color: var(--violet);">🎯 动作（则...）</div>
        <div class="rule-row">
          <span class="rule-label">则</span>
          <select class="form-select-sm" v-model="ruleForm.actionType">
            <option value="require">必须填写</option>
            <option value="forbid">必须为空</option>
            <option value="copy">自动赋值</option>
            <option value="validate_match">值匹配校验</option>
            <option value="equals">等于</option>
            <option value="not_equals">不等于</option>
            <option value="greater_than">大于</option>
            <option value="less_than">小于</option>
            <option value="greater_equal">大于等于</option>
            <option value="less_equal">小于等于</option>
            <option value="between">介于</option>
            <option value="contains">包含</option>
            <option value="not_contains">不包含</option>
          </select>
          <select class="form-select-sm" v-model="ruleForm.actionTarget">
            <option value="">目标字段</option>
            <option v-for="c in allIncludedCols" :key="c.header" :value="c.header">{{ c.header }}</option>
          </select>
        </div>
        <div v-if="needsActionValue" class="rule-row">
          <select class="form-select-sm" v-model="ruleForm.actionValType" style="flex: 0 0 80px;">
            <option value="value">值</option>
            <option value="field">字段</option>
          </select>
          <input v-if="ruleForm.actionValType === 'value'" class="form-input-sm" v-model="ruleForm.actionVal"
            placeholder="输入值（多值用竖线分隔）" />
          <select v-else class="form-select-sm" v-model="ruleForm.actionValField">
            <option value="">选择字段</option>
            <option v-for="c in allIncludedCols" :key="c.header" :value="c.header">{{ c.header }}</option>
          </select>
        </div>
        <button class="btn btn-sm btn-primary" style="margin-top: 8px;" @click="addRule">➕ 添加规则</button>
      </div>
    </div>

    <!-- 筛选字段 -->
    <div class="admin-cd">
      <div class="cd-title">🔍 筛选字段</div>
      <select class="form-select" v-model="editFilterField">
        <option value="">-- 不启用 --</option>
        <option v-for="c in allIncludedCols" :key="c.header" :value="c.header">{{ c.header }}</option>
      </select>
    </div>

    <!-- 行标题字段 -->
    <div class="admin-cd">
      <div class="cd-title">🏷️ 行标题字段（按点击顺序排列）</div>
      <div class="title-chips">
        <div v-for="c in allIncludedCols" :key="c.header"
          :class="['title-chip', { on: editTitleFields.includes(c.header) }]"
          @click="toggleTitleField(c.header)">
          {{ editTitleFields.includes(c.header) ? '🏷️ ' : '' }}{{ c.header }}
        </div>
      </div>
      <div class="title-preview">
        {{ editTitleFields.length
          ? '当前顺序：' + editTitleFields.map((h, i) => (i + 1) + '.' + h).join(' → ')
          : '未选择行标题字段' }}
      </div>
    </div>

    <!-- 填报人管理 -->
    <div class="admin-cd">
      <div class="cd-title">👥 填报人管理（{{ editMembers.length }}人）</div>
      <p style="font-size: 12px; color: var(--tm); margin-bottom: 8px;">每行一个姓名</p>
      <textarea class="form-textarea" v-model="editMembersText" rows="5"
        placeholder="请输入填报人姓名，每行一个"></textarea>
    </div>

    <!-- 保存按钮 -->
    <div class="sticky-save">
      <button class="btn btn-primary btn-block" @click="onSave" :disabled="saving">
        {{ saving ? '保存中...' : '💾 保存全部修改' }}
      </button>
    </div>

    <!-- 底部操作 -->
    <div class="editor-footer">
      <button class="btn btn-sm btn-ghost" @click="$emit('back')">← 返回列表</button>
      <button class="btn btn-sm btn-default" style="color: var(--d);" @click="onDelete">🗑️ 删除模板</button>
    </div>

    <!-- 基础数据导入：隐藏文件输入 -->
    <input
      ref="baseImportInput"
      type="file"
      accept=".xlsx,.xls,.csv"
      style="display: none;"
      @change="onBaseImportSelect"
    />

    <!-- 基础数据导入预览弹窗 -->
    <BaseModal
      :show="showImportPreview"
      title="📥 导入替换基础数据"
      max-width="680px"
      @close="cancelBaseImport"
    >
      <template v-if="importPreviewData">
        <div class="import-info">
          <span>✓</span>
          <div>
            <strong>{{ importPreviewData.fileName }}</strong><br />
            {{ importPreviewData.headers.length }} 列 · {{ importPreviewData.rows.length }} 行数据
          </div>
        </div>

        <div class="import-match-info">
          <div style="margin-bottom: 6px; font-weight: 600; font-size: 13px;">列匹配情况</div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            <span v-for="c in importColumns" :key="c.header"
              :class="['import-col-tag', c.matched ? 'matched' : 'unmatched']">
              {{ c.header }}{{ c.matched ? ' ✓' : ' ✕' }}
            </span>
          </div>
          <div v-if="importColumns.some(c => !c.matched)" style="font-size: 11px; color: var(--w); margin-top: 8px;">
            ⚠️ 标 ✕ 的列在模板中不存在，将被忽略
          </div>
          <div v-if="importPreviewData && allIncludedCols.some(c => !importPreviewData!.headers.includes(c.header))" style="font-size: 11px; color: var(--violet); margin-top: 4px;">
            ⚠️ 模板中的「{{ allIncludedCols.filter(c => importPreviewData && !importPreviewData.headers.includes(c.header)).map(c => c.header).join('、') }}」字段在导入数据中缺失，将置为空
          </div>
        </div>

        <div style="font-size: 13px; font-weight: 600; margin: 12px 0 8px;">👁️ 数据预览（前5行）</div>
        <div class="table-wrap" style="max-height: 240px;">
          <table>
            <thead>
              <tr>
                <th v-for="h in importPreviewData.headers" :key="h"
                  :style="importColumns.find(c => c.header === h && !c.matched) ? 'color: var(--tm); text-decoration: line-through;' : ''">
                  {{ h }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in importPreviewData.rows.slice(0, 5)" :key="idx">
                <td v-for="(cell, ci) in row" :key="ci">{{ cell }}</td>
              </tr>
              <tr v-if="importPreviewData.rows.length > 5">
                <td :colspan="importPreviewData.headers.length" style="text-align: center; color: var(--tm);">
                  ...共 {{ importPreviewData.rows.length }} 行
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="import-warn-box">
          ⚠️ 确认后将<strong>替换全部</strong> {{ tpl?.rows?.length || 0 }} 行基础数据为导入的 {{ importPreviewData.rows.length }} 行，已填报的关联数据不受影响
        </div>
      </template>

      <template #footer>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-default" style="flex: 1;" @click="cancelBaseImport">取消</button>
          <button class="btn btn-primary" style="flex: 1;" @click="confirmBaseImport" :disabled="importReplacing">
            {{ importReplacing ? '导入中...' : '✓ 确认替换' }}
          </button>
        </div>
      </template>
    </BaseModal>

    <InlineToast
      :show="showInlineToast"
      :message="inlineToastMsg"
      @close="showInlineToast = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useDataStore } from '@/stores/useDataStore';
import { useValidation } from '@/composables/useValidation';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import * as XLSX from 'xlsx';
import type { Column, FieldRule, FieldType, Template } from '@/types';
import { MAX_FILE_SIZE } from '@/constants';
import BaseModal from '@/components/common/BaseModal.vue';
import InlineToast from '@/components/common/InlineToast.vue';

const { validateAndApplyRules, getRuleDesc, getActionLabel } = useValidation();

const isNewTpl = computed(() => isNewProp.value);

const props = defineProps<{ tplId: string; isNew?: boolean }>();
const emit = defineEmits<{ back: []; saved: [] }>();

const dataStore = useDataStore();
const { confirmModal, confirmDanger } = useConfirm();
const { toastSuccess, toastWarning, toastError } = useToast();

const editName = ref('');
const editColumns = ref<(Column & { _opts?: string })[]>([]);
const editFilterField = ref('');
const editTitleFields = ref<string[]>([]);
const editMembers = ref<string[]>([]);
const editMembersText = ref('');
const editRules = ref<FieldRule[]>([]);
const saving = ref(false);
const isNewProp = ref(false);
const basePage = ref(0);
const pageSize = 50;
const baseSearch = ref('');
const selectedRows = ref(new Set<number>());
const showEditRow = ref(false);
const editRowIndex = ref(-1);
const editRowData = ref<Record<string, string>>({});
const editRowErrors = ref<Record<string, string>>({});
const inlineToastMsg = ref('');
const showInlineToast = ref(false);

// 基础数据导入
const baseImportInput = ref<HTMLInputElement | null>(null);
const showImportPreview = ref(false);
const importPreviewData = ref<{ fileName: string; headers: string[]; rows: string[][] } | null>(null);
const importColumns = ref<{ header: string; matched: boolean }[]>([]);
const importReplacing = ref(false);

function showInlineToastFn(msg: string) {
  inlineToastMsg.value = msg;
  showInlineToast.value = true;
}

const ruleForm = ref({
  condField: '',
  condOp: 'equals',
  condValType: 'value',
  condVal: '',
  condValField: '',
  actionType: 'require',
  actionTarget: '',
  actionValType: 'value',
  actionVal: '',
  actionValField: '',
});

const tpl = computed(() => dataStore.tpls.find(t => t.id === props.tplId));

const allIncludedCols = computed(() => editColumns.value.filter((c: Column & { _opts?: string }) => c.included !== false));
const fixedCols = computed(() => allIncludedCols.value.filter((c: Column) => !c.isEditable));
const editableCols = computed(() => allIncludedCols.value.filter((c: Column) => c.isEditable));

const hasDuplicate = computed(() => {
  const names = editColumns.value.filter((c: Column & { _opts?: string }) => c.included !== false).map((c: Column & { _opts?: string }) => c.header);
  const seen = new Set<string>();
  const dupes = new Set<string>();
  names.forEach((n: string) => { if (seen.has(n)) dupes.add(n); else seen.add(n); });
  return dupes.size > 0;
});

const duplicateNames = computed(() => {
  const names = editColumns.value.filter((c: Column & { _opts?: string }) => c.included !== false).map((c: Column & { _opts?: string }) => c.header);
  const seen = new Set<string>();
  const dupes = new Set<string>();
  names.forEach((n: string) => { if (seen.has(n)) dupes.add(n); else seen.add(n); });
  return [...dupes].join('、');
});

const activeRulesCount = computed(() => editRules.value.filter(r => !r.disabled).length);
const allDisabled = computed(() => editRules.value.length > 0 && editRules.value.every(r => r.disabled));

const needsActionValue = computed(() => {
  return ['copy', 'validate_match', 'equals', 'not_equals', 'greater_than', 'less_than',
    'greater_equal', 'less_equal', 'between', 'contains', 'not_contains'].includes(ruleForm.value.actionType);
});

const filteredBaseRows = computed(() => {
  if (!tpl.value?.rows) return [];
  const search = baseSearch.value.trim().toLowerCase();
  const allRows: number[] = [];
  for (let i = 0; i < tpl.value.rows.length; i++) {
    if (!search) {
      allRows.push(i);
    } else {
      const row = tpl.value.rows[i];
      const match = Object.values(row).some(v => String(v).toLowerCase().includes(search));
      if (match) allRows.push(i);
    }
  }
  return allRows;
});

const pagedRows = computed(() => {
  const start = basePage.value * pageSize;
  const end = Math.min(start + pageSize, filteredBaseRows.value.length);
  return filteredBaseRows.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredBaseRows.value.length / pageSize));
});

const isAllSelected = computed(() => {
  if (!pagedRows.value.length) return false;
  return pagedRows.value.every(ri => selectedRows.value.has(ri));
});

function validateEditRow(): boolean {
  editRowErrors.value = {};
  const t = tpl.value;
  if (!t) return false;

  const errors: Record<string, string> = {};

  // 构建数据，确保所有值为字符串
  const data: Record<string, string> = {};
  allIncludedCols.value.forEach(c => {
    data[c.header] = String(editRowData.value[c.header] ?? '');
  });

  // 直接调用 useValidation 校验
  const validationErrors = validateAndApplyRules(
    t,
    editRowIndex.value,
    data,
    allIncludedCols.value,
    editFilterField.value,
    ''
  );

  // 将错误映射到对应字段
  validationErrors.forEach(err => {
    // 提取字段名：格式为「字段名」xxx 或 第 N 行：「字段名」xxx
    const match = err.match(/「([^」]+)」/);
    if (match && match[1]) {
      const fieldName = match[1];
      // 去掉"第 N 行："前缀
      const cleanMsg = err.replace(/^第 \d+ 行：/, '');
      if (!errors[fieldName]) {
        errors[fieldName] = cleanMsg;
      }
    }
  });

  editRowErrors.value = errors;
  return Object.keys(errors).length === 0;
}

function toggleRow(ri: number) {
  const s = new Set(selectedRows.value);
  if (s.has(ri)) s.delete(ri);
  else s.add(ri);
  selectedRows.value = s;
}

function toggleAllRows() {
  if (isAllSelected.value) {
    selectedRows.value = new Set();
  } else {
    selectedRows.value = new Set(pagedRows.value);
  }
}

function openEditRow(ri: number) {
  const t = tpl.value;
  if (!t?.rows?.[ri]) return;
  editRowIndex.value = ri;
  editRowData.value = { ...t.rows[ri] };
  showEditRow.value = true;
}

function saveEditRow() {
  if (!validateEditRow()) {
    showInlineToastFn('⚠️ 请修正标红字段后保存');
    return;
  }
  const t = tpl.value;
  if (!t?.rows || editRowIndex.value < 0) return;
  t.rows[editRowIndex.value] = { ...editRowData.value };
  showEditRow.value = false;
  editRowIndex.value = -1;
  editRowData.value = {};
  editRowErrors.value = {};
  toastSuccess('✓ 已保存');
}

function addBaseRow() {
  const t = tpl.value;
  if (!t) return;
  if (!t.rows) t.rows = [];
  const newRow: Record<string, string> = { _idx: String(t.rows.length) };
  allIncludedCols.value.forEach(c => {
    if (!c.isEditable) {
      newRow[c.header] = '';
    }
  });
  t.rows.push(newRow);
  // 跳转到新增行所在的页
  basePage.value = Math.max(0, Math.ceil(t.rows.length / pageSize) - 1);
  openEditRow(t.rows.length - 1);
  toastSuccess('✓ 已新增一行');
}

function deleteBaseRow(ri: number) {
  const t = tpl.value;
  if (!t?.rows) return;
  const rowTitle = getRowTitleForDisplay(t, ri) || '第' + (ri + 1) + '行';
  confirmModal('确定删除「' + rowTitle + '」？', () => {
    t.rows.splice(ri, 1);
    // 更新 _idx
    t.rows.forEach((row, i) => { row._idx = String(i); });
    selectedRows.value.delete(ri);
    toastSuccess('✓ 已删除');
  });
}

function deleteSelectedRows() {
  if (!selectedRows.value.size) return;
  const count = selectedRows.value.size;
  confirmModal('确定删除选中的 ' + count + ' 行数据？', () => {
    const t = tpl.value;
    if (!t?.rows) return;
    const indices = [...selectedRows.value].sort((a, b) => b - a);
    indices.forEach(ri => { t.rows.splice(ri, 1); });
    t.rows.forEach((row, i) => { row._idx = String(i); });
    selectedRows.value = new Set();
    toastSuccess('✓ 已删除 ' + count + ' 行');
  });
}

function deleteAllRows() {
  const t = tpl.value;
  if (!t?.rows?.length) return;
  confirmDanger('确定删除全部 ' + t.rows.length + ' 行基础数据？\n\n已填报的关联数据不受影响，但填报页面将无法显示对应行。', () => {
    t.rows = [];
    selectedRows.value = new Set();
    basePage.value = 0;
    toastSuccess('✓ 已删除全部基础数据');
  });
}

// ===== 基础数据导出 =====
function exportBaseData() {
  const t = tpl.value;
  if (!t?.rows?.length) { toastWarning('无基础数据可导出'); return; }

  const cols = allIncludedCols.value;
  const headers = cols.map(c => c.header);
  const data = t.rows.map(row => {
    const obj: Record<string, string> = {};
    cols.forEach(c => { obj[c.header] = row[c.header] || ''; });
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(data, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '基础数据');
  const fileName = (t.name || '模板') + '_基础数据.xlsx';
  XLSX.writeFile(wb, fileName);
  toastSuccess('✓ 已导出 ' + t.rows.length + ' 行基础数据');
}

// ===== 基础数据导入 =====
function onBaseImportSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.[0]) parseBaseImport(input.files[0]);
  input.value = '';
}

function parseBaseImport(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!['xlsx', 'xls', 'csv'].includes(ext || '')) { toastWarning('不支持的文件格式'); return; }
  if (file.size > MAX_FILE_SIZE) { toastWarning('文件过大'); return; }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target?.result as ArrayBuffer), { type: 'array', cellDates: true, dateNF: 'yyyy-MM-dd' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false }) as unknown[][];
      if (!data || data.length < 1) throw new Error('数据为空');

      const rawHeaders = data[0].map(h => String(h || '').trim()).filter(Boolean);
      const rows = data.slice(1).map(r => rawHeaders.map((_, i) => {
        const v = r[i];
        if (v === null || v === undefined) return '';
        if (typeof v === 'object' && v instanceof Date) return v.toISOString().split('T')[0];
        return String(v).trim();
      }));

      const tplHeaders = allIncludedCols.value.map(c => c.header);
      const matched = rawHeaders.map(h => ({ header: h, matched: tplHeaders.includes(h) }));

      importPreviewData.value = { fileName: file.name, headers: rawHeaders, rows };
      importColumns.value = matched;
      showImportPreview.value = true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '解析失败';
      toastError('解析失败: ' + msg);
    }
  };
  reader.readAsArrayBuffer(file);
}

async function confirmBaseImport() {
  if (!importPreviewData.value) return;
  const t = tpl.value;
  if (!t) return;

  const preview = importPreviewData.value;
  const tplCols = allIncludedCols.value;
  const headerToIdx: Record<string, number> = {};
  preview.headers.forEach((h, i) => {
    if (tplCols.find(c => c.header === h)) headerToIdx[h] = i;
  });

  if (Object.keys(headerToIdx).length === 0) {
    toastWarning('导入数据的列名与模板字段无匹配，请检查列名');
    return;
  }

  importReplacing.value = true;
  try {
    const newRows: Record<string, string>[] = preview.rows.map((row, i) => {
      const obj: Record<string, string> = { _idx: String(i) };
      tplCols.forEach(c => {
        if (headerToIdx[c.header] !== undefined) {
          obj[c.header] = row[headerToIdx[c.header]] || '';
        } else {
          obj[c.header] = '';
        }
      });
      return obj;
    });

    t.rows = newRows;
    await dataStore.saveTemplate(t);
    showImportPreview.value = false;
    importPreviewData.value = null;
    importColumns.value = [];
    selectedRows.value = new Set();
    basePage.value = 0;
    toastSuccess('✓ 已替换 ' + newRows.length + ' 行基础数据');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '导入失败';
    toastError('导入失败: ' + msg);
  } finally {
    importReplacing.value = false;
  }
}

function cancelBaseImport() {
  showImportPreview.value = false;
  importPreviewData.value = null;
  importColumns.value = [];
}

function getRowTitleForDisplay(t: Template, ri: number): string {
  if (!t.rows?.[ri]) return '';
  const tfs = t.titleFields || [];
  if (!tfs.length) return '';
  return tfs.map((h: string) => t.rows[ri][h] || '').filter((v: string) => v.trim()).join(' · ') || '';
}

onMounted(() => {
  isNewProp.value = !!props.isNew;
  initFromTpl();
});
watch(() => props.tplId, () => initFromTpl());

function initFromTpl() {
  const t = tpl.value;
  if (!t) return;
  editName.value = t.name || '';
  editColumns.value = (t.columns || []).filter(c => c.included !== false).map(c => {
    let uniqVals = c.uniqueValues || [];
    let opts = uniqVals.join(',');
    // select 字段若无选项，自动从基础数据行提取唯一值
    if (c.type === 'select' && !opts && t.rows?.length) {
      const vals = t.rows.map(r => (r[c.header] || '').trim()).filter(Boolean);
      uniqVals = [...new Set(vals)];
      opts = uniqVals.join(',');
    }
    return { ...c, uniqueValues: uniqVals, _opts: opts };
  });
  editFilterField.value = t.filterField || '';
  editTitleFields.value = [...(t.titleFields || [])];
  editMembers.value = dataStore.getTplMembers(props.tplId).slice();
  editMembersText.value = editMembers.value.join('\n');
  editRules.value = JSON.parse(JSON.stringify(t.rules || []));
  basePage.value = 0;
}

function getSelectOpts(col: Column & { _opts?: string }): string[] {
  if (col.type !== 'select') return [];
  if (col._opts?.trim()) return col._opts.split(',').map(s => s.trim()).filter(Boolean);
  return col.uniqueValues || [];
}

/** 字段类型变更时，若切换为 select 且无选项，自动从基础数据提取 */
function onTypeChange(_idx: number, col: Column & { _opts?: string }) {
  if (col.type === 'select' && !col._opts?.trim()) {
    const t = tpl.value;
    if (t?.rows?.length) {
      const vals = t.rows.map(r => (r[col.header] || '').trim()).filter(Boolean);
      const uniq = [...new Set(vals)];
      if (uniq.length) {
        col._opts = uniq.join(',');
        col.uniqueValues = [...uniq];
      }
    }
  }
}

function removeField(idx: number) {
  if (editColumns.value.length <= 1) { toastWarning('至少保留一列'); return; }
  editColumns.value.splice(idx, 1);
}

function addField() {
  editColumns.value.push({
    id: 'c' + Date.now(),
    header: '新字段',
    type: 'text' as FieldType,
    required: false,
    isEditable: true,
    included: true,
    uniqueValues: [],
    _opts: '',
  });
}

function toggleTitleField(header: string) {
  const idx = editTitleFields.value.indexOf(header);
  if (idx >= 0) editTitleFields.value.splice(idx, 1);
  else editTitleFields.value.push(header);
}

function toggleAllRules() {
  const setTo = !allDisabled.value;
  editRules.value.forEach(r => { r.disabled = setTo; });
}

function addRule() {
  const f = ruleForm.value;
  if (!f.condField || !f.actionTarget) { toastWarning('请选择条件字段和目标字段'); return; }

  const condVal = f.condValType === 'field' ? f.condValField : f.condVal;
  const condValueType: 'value' | 'field' = f.condValType as 'value' | 'field';

  const action: FieldRule['action'] = {
    type: f.actionType as FieldRule['action']['type'],
    target: f.actionTarget,
  };
  if (needsActionValue.value) {
    action.value = f.actionValType === 'field' ? f.actionValField : f.actionVal;
    action.valueType = f.actionValType as 'value' | 'field';
  }

  editRules.value.push({
    condition: {
      field: f.condField,
      operator: f.condOp as FieldRule['condition']['operator'],
      value: condVal,
      valueType: condValueType,
    },
    action,
    disabled: false,
  });

  ruleForm.value = { ...ruleForm.value, condField: '', condVal: '', condValField: '', actionTarget: '', actionVal: '', actionValField: '' };
  toastSuccess('✓ 规则已添加');
}

function getActionTagClass(type: string): string {
  if (type === 'require') return 'tag-warn';
  if (type === 'copy') return 'tag-violet';
  return 'tag-info';
}

async function onSave() {
  if (hasDuplicate.value) { toastWarning('以下字段名重复：' + duplicateNames.value + '，请修改后保存'); return; }

  saving.value = true;
  try {
    const t = tpl.value;
    if (!t) return;

    const oldCols = t.columns.filter(c => c.included !== false);
    const oldToNew: Record<string, string> = {};
    editColumns.value.forEach((col: Column & { _opts?: string }, idx: number) => {
      if (oldCols[idx] && oldCols[idx].header !== col.header) {
        oldToNew[oldCols[idx].header] = col.header;
      }
    });

    t.name = editName.value.trim() || '未命名模板';
    t.columns = editColumns.value.map((c: Column & { _opts?: string }) => ({
      id: c.id, header: c.header, type: c.type, required: c.required,
      isEditable: c.isEditable, included: c.included !== false,
      uniqueValues: c.type === 'select' ? (c._opts || '').split(',').map((s: string) => s.trim()).filter(Boolean) : (c.uniqueValues || []),
    }));
    t.filterField = editFilterField.value;
    t.titleFields = editTitleFields.value;
    t.rules = JSON.parse(JSON.stringify(editRules.value));

    if (Object.keys(oldToNew).length > 0) {
      if (t.rows) {
        t.rows.forEach(row => {
          Object.keys(oldToNew).forEach(oldKey => {
            if (row.prototype.hasOwnProperty.call(row,oldKey)) { row[oldToNew[oldKey]] = row[oldKey]; delete row[oldKey]; }
          });
        });
      }
      const tplSub = dataStore.sub[props.tplId] || {};
      Object.keys(tplSub).forEach(date => {
        const daySub = tplSub[date] || {};
        Object.keys(daySub).forEach(user => {
          const userData = (daySub as Record<string, Record<string, Record<string, string>>>)[user] || {};
          Object.keys(userData).forEach(ri => {
            const rowData = userData[ri];
            if (rowData) {
              Object.keys(oldToNew).forEach(oldKey => {
                if (rowData.prototype.hasOwnProperty.call(rowData,oldKey)) { rowData[oldToNew[oldKey]] = rowData[oldKey]; delete rowData[oldKey]; }
              });
            }
          });
        });
      });
      if (t.filterField && oldToNew[t.filterField]) t.filterField = oldToNew[t.filterField];
    }

    // 检查模板是否已存在于后端（通过检查是否有 submission 数据或通过标志判断）
     // 新模板用 createTemplate，已有模板用 saveTemplate
    if (isNewProp.value) {
      await dataStore.createTemplate(t);
      isNewProp.value = false;
    } else {
      await dataStore.saveTemplate(t, Object.keys(oldToNew).length ? oldToNew : undefined);
    }

    const list = editMembersText.value.split('\n').map(s => s.trim()).filter(Boolean);
    dataStore.members[props.tplId] = list;
    await dataStore.saveMembers(props.tplId);

    toastSuccess('✓ 模板及关联数据已保存');
    emit('saved');
  } catch (_err) {
    const msg = _err instanceof Error ? _err.message : '未知错误';
    toastError('保存失败: ' + msg);
  } finally {
    saving.value = false;
  }
}

function onDelete() {
  const t = tpl.value;
  if (!t) return;
  confirmModal('确定删除模板「' + t.name + '」？\n此操作不可恢复！', async () => {
    try {
      await dataStore.deleteTemplate(props.tplId);
      toastSuccess('✓ 已删除');
      emit('back');
    } catch (_err) {
      toastError('删除失败');
    }
  });
}

// 筛选字段变化时自动提取填报人
watch(editFilterField, (newVal: string) => {
  const t = tpl.value;
  if (!t || !t.rows || !t.rows.length) return;

  if (!newVal) {
    // 清空筛选字段时不清空已有成员
    return;
  }

  // 找到筛选字段在 included columns 中的索引
  const includedCols = t.columns.filter(c => c.included !== false);
  const colIdx = includedCols.findIndex(c => c.header === newVal);
  if (colIdx < 0) return;

  // 从 rows 中提取该列的唯一值
  const set = new Set<string>();
  t.rows.forEach(row => {
    const v = (row[newVal] || '').trim();
    if (v) set.add(v);
  });

  const extracted = [...set];
  editMembers.value = extracted;
  editMembersText.value = extracted.join('\n');
});
</script>

<style scoped>
.tpl-editor {
  padding-bottom: 120px;
}
.editor-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.admin-cd { background: var(--sf); border: 1px solid var(--b); border-radius: var(--rl); padding: 20px; margin-bottom: 16px; }
.cd-title { font-size: 14px; font-weight: 600; margin-bottom: 16px; color: var(--t); }
.form-group { margin-bottom: 12px; }
.form-label { font-size: 13px; color: var(--ts); font-weight: 500; display: block; margin-bottom: 4px; }
.form-input, .form-select, .form-textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--r); font-size: 13px; font-family: inherit; color: var(--t); background: var(--sf); outline: none; transition: border-color 0.15s; }
.form-input:focus, .form-select:focus, .form-textarea:focus { border-color: var(--p); }
.form-select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; -webkit-appearance: none; appearance: none; }
.form-input-sm, .form-select-sm { flex: 1; padding: 5px 8px; border: 1px solid var(--border); border-radius: var(--r); font-size: 12px; font-family: inherit; color: var(--t); background: var(--sf); outline: none; }
.form-select-sm { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 6px center; padding-right: 24px; -webkit-appearance: none; appearance: none; }
.dup-warning { padding: 14px; background: var(--wl); border: 1px solid #fbbf24; border-radius: var(--r); margin-bottom: 16px; }
.field-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.field-grid > * {
  flex: 1 1 280px;
  min-width: 0;
}
.field-card {
  background: var(--bl);
  border: 1px solid var(--b);
  border-radius: var(--r);
  padding: 12px;
  min-width: 0;
  box-sizing: border-box;
}
.field-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.field-num { width: 24px; height: 24px; border-radius: 50%; background: var(--pl); color: var(--p); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
.field-name { flex: 1; font-size: 13px; font-weight: 600; }
.field-del { width: 24px; height: 24px; border: none; background: var(--dl); color: var(--d); border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; }
.field-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.field-label { font-size: 12px; color: var(--ts); min-width: 32px; flex-shrink: 0; }
.field-toggles { display: flex; gap: 16px; margin-top: 4px; }
.field-toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ts); }
.switch { width: 36px; height: 20px; border-radius: 10px; background: var(--border); cursor: pointer; position: relative; transition: background 0.2s; }
.switch::after { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: #fff; top: 2px; left: 2px; transition: transform 0.2s; }
.switch.on { background: var(--p); }
.switch.on::after { transform: translateX(16px); }
.table-wrap { overflow-x: auto; border: 1px solid var(--b); border-radius: var(--r); }
table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 300px; }
th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--b); }
th { background: var(--bl); font-weight: 600; color: var(--ts); font-size: 12px; position: sticky; top: 0; }
.pager { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--ts); margin-top: 8px; }
.rule-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--bl); border: 1px solid var(--b); border-radius: var(--r); margin-bottom: 6px; }
.rule-form { padding: 12px; background: var(--bl); border: 1px solid var(--b); border-radius: var(--r); }
.rule-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-bottom: 8px; }
.rule-label { font-size: 12px; color: var(--ts); white-space: nowrap; }
.tag { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 500; flex-shrink: 0; }
.tag-info { background: var(--pl); color: var(--p); }
.tag-warn { background: var(--wl); color: var(--w); }
.tag-violet { background: var(--vl); color: var(--violet); }
.title-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.title-chip { padding: 6px 12px; border: 1px solid var(--b); border-radius: var(--r); font-size: 12px; cursor: pointer; transition: all 0.15s; background: var(--bl); }
.title-chip.on { background: var(--p3); border-color: var(--p); color: var(--p); font-weight: 500; }
.title-preview { padding: 10px; background: var(--bl); border: 1px solid var(--b); border-radius: var(--r); font-size: 12px; color: var(--ts); }
.sticky-save {
  position: sticky;
  bottom: 70px;
  z-index: 50;
  padding: 12px 0;
  background: var(--bg);
}
.editor-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--b);
  padding-bottom: 16px;
}
.new-tpl-hint {
  padding: 10px 14px;
  background: var(--wl);
  border: 1px solid #fbbf24;
  border-radius: var(--r);
  font-size: 13px;
  color: var(--w);
  margin-bottom: 16px;
}
.base-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.fill-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.fill-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fill-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ts);
}

.fill-required {
  color: #ef4444;
  font-size: 16px;
  font-weight: 700;
  margin-left: 2px;
  vertical-align: middle;
  text-shadow: 0 0 2px rgba(239, 68, 68, 0.3);
}

.fill-readonly {
  font-size: 14px;
  color: var(--t);
  padding: 8px 12px;
  background: var(--bl);
  border: 1px solid var(--b);
  border-radius: var(--r);
}

.fill-input,
.fill-textarea,
.fill-select {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid var(--border);
  border-radius: var(--r);
  font-size: 14px;
  font-family: inherit;
  color: var(--t);
  background: var(--sf);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.fill-input:focus,
.fill-textarea:focus,
.fill-select:focus {
  border-color: var(--p);
  box-shadow: 0 0 0 3px var(--pl);
}

.fill-textarea {
  resize: vertical;
  min-height: 60px;
}

.fill-select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
  -webkit-appearance: none;
  appearance: none;
}

.fill-error .fill-input,
.fill-error .fill-textarea,
.fill-error .fill-select {
  border-color: var(--d);
  background: #fef2f2;
}

.fill-error .fill-input:focus,
.fill-error .fill-textarea:focus,
.fill-error .fill-select:focus {
  box-shadow: 0 0 0 3px var(--dl);
}

.fill-error-msg {
  font-size: 12px;
  color: var(--d);
  padding: 4px 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--r);
  font-size: 13px;
  font-family: inherit;
  color: var(--t);
  background: var(--sf);
  outline: none;
  resize: vertical;
}

.form-textarea:focus {
  border-color: var(--p);
}

.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--r);
  font-size: 13px;
  font-family: inherit;
  color: var(--t);
  background: var(--sf);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;
  -webkit-appearance: none;
  appearance: none;
  outline: none;
}

.form-select:focus {
  border-color: var(--p);
}

.fill-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
  background: var(--bl);
  color: var(--ts);
  margin-left: 4px;
}

/* ===== 基础数据导入预览 ===== */
.import-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--okl);
  border-radius: var(--r);
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--ok);
}

.import-match-info {
  padding: 12px;
  background: var(--bl);
  border: 1px solid var(--b);
  border-radius: var(--r);
  margin-bottom: 12px;
}

.import-col-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
}

.import-col-tag.matched {
  background: var(--okl);
  color: var(--ok);
}

.import-col-tag.unmatched {
  background: var(--dl);
  color: var(--d);
}

.import-warn-box {
  margin-top: 12px;
  padding: 12px;
  background: var(--wl);
  border: 1px solid #fbbf24;
  border-radius: var(--r);
  font-size: 13px;
  color: var(--w);
}
</style>
