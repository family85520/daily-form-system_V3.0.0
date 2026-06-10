// =============================================
// 每日数据填报系统 — TypeScript 类型定义
// 从原 index.html 中提取的所有数据结构
// =============================================

// ===== 字段类型 =====
export type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'date' | 'sequence';

// ===== 字段约束 =====
export interface FieldConstraints {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  errorMessage?: string;
}

// ===== 列定义 =====
export interface Column {
  id: string;
  header: string;
  type: FieldType;
  required: boolean;
  isEditable: boolean;
  included: boolean;
  uniqueValues: string[];
  constraints?: FieldConstraints;
}

// ===== 模板 =====
export interface Template {
  id: string;
  name: string;
  columns: Column[];
  rows: Record<string, string>[];
  filterField: string;
  titleFields: string[];
  rules: FieldRule[];
}

// ===== 规则引擎：条件操作符 =====
export type RuleOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_equal'
  | 'less_equal'
  | 'between'
  | 'contains'
  | 'not_contains'
  | 'is_empty'
  | 'is_not_empty';

// ===== 规则引擎：动作类型 =====
export type RuleActionType =
  | 'require'
  | 'forbid'
  | 'copy'
  | 'validate_match'
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_equal'
  | 'less_equal'
  | 'between'
  | 'contains'
  | 'not_contains';

// ===== 规则引擎：值来源类型 =====
export type ValueSourceType = 'value' | 'field';

// ===== 规则引擎：条件 =====
export interface RuleCondition {
  field: string;
  operator: RuleOperator;
  value: string;
  valueType: ValueSourceType;
}

// ===== 规则引擎：动作 =====
export interface RuleAction {
  type: RuleActionType;
  target: string;
  value?: string;
  valueType?: ValueSourceType;
}

// ===== 规则引擎：完整规则 =====
export interface FieldRule {
  condition: RuleCondition;
  action: RuleAction;
  disabled: boolean;
}

// ===== 提交数据：单行提交 =====
export interface RowSubmission {
  [fieldName: string]: string;
}

// ===== 提交数据：某天某人的所有行 =====
export interface UserSubmissions {
  [rowIndex: string]: RowSubmission;
}

// ===== 提交数据：某天所有人的提交 =====
export interface DaySubmissions {
  [user: string]: UserSubmissions;
}

// ===== 提交数据：某模板所有日期的提交 =====
export interface TemplateSubmissions {
  [date: string]: DaySubmissions;
}

// ===== 全局数据 =====
export interface AppData {
  tpls: Template[];
  members: Record<string, string[]>;
  sub: Record<string, TemplateSubmissions>;
}

// ===== 继承：值来源 =====
export type ValueSource = 'today' | 'prev' | 'base' | 'empty';

// ===== 继承：单字段有效值 =====
export interface EffectiveValue {
  val: string;
  src: ValueSource;
}

// ===== 继承：单行有效值（所有字段） =====
export interface EffectiveRow {
  [fieldName: string]: EffectiveValue;
}

// ===== 校验：错误项 =====
export interface ValidationError {
  message: string;
  field?: string;
  rowIndex?: number;
}

// ===== 统计：聚合函数类型 =====
export type AggregateFunction = 'count' | 'sum' | 'avg' | 'max' | 'min' | 'pct';

// ===== 统计：指标配置 =====
export interface StatMetric {
  val: string;
  func: AggregateFunction;
}

// ===== 统计：收集的数据项 =====
export interface StatDataItem {
  date: string;
  user: string;
  ri: number;
  data: RowSubmission;
  base: RowSubmission;
}

// ===== 导入：预览数据 =====
export interface ImportPreviewData {
  headers: string[];
  rows: string[][];
  fileName: string;
}

// ===== 导入：列配置（导入预览时使用） =====
export interface ImportColumnConfig {
  header: string;
  type: FieldType;
  required: boolean;
  isEditable: boolean;
  included: boolean;
  uniqueValues: string[];
  sampleValues: string[];
}

// ===== 连接状态 =====
export type ConnectionStatus = 'ok' | 'err' | 'loading';

// ===== 页面标识 =====
export type PageId = 'fill' | 'history' | 'stat' | 'admin';

// ===== 管理页面 Tab =====
export type AdminTabId = 'overview' | 'templates' | 'data' | 'import' | 'export' | 'settings';

// ===== 统计页面 Tab =====
export type StatTabId = 'overview' | 'fill' | 'data';

// ===== 统计筛选 =====
export type StatFilterMode = 'all' | 'filled' | 'unfilled' | '';
