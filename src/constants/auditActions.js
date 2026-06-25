// src/constants/auditActions.js
// 审计日志 action 常量，消除字符串字面量散落

module.exports = {
    // 认证相关
    LOGIN: 'login',
    LOGIN_FAIL: 'login_fail',
    LOGOUT: 'logout',
    PASSWORD_CHANGE: 'password_change',

    // 模板相关
    TEMPLATE_CREATE: 'template_create',
    TEMPLATE_UPDATE: 'template_update',
    TEMPLATE_DELETE: 'template_delete',
    FIELD_RENAME: 'field_rename',
    IMPORT_TEMPLATE: '导入模板',

    // 数据相关
    DATA_SAVE: 'data_save',
    SUBMISSION_SAVE: 'submission_save',
    SUBMISSION_DELETE: 'submission_delete',
    EXPORT_CSV: 'export_csv',
    EXPORT_EXCEL: 'export_excel',

    // 成员相关
    MEMBER_SAVE: 'member_save',

    // 系统相关
    RESET_DATA: '重置',
    RESET_FAIL: '重置失败',
    AUDIT_CLEAR: 'audit_clear',
};
