// src/db/queryHelpers.js
// 数据库查询辅助函数 — 消除 data.js 和 export.js 中的重复代码

/**
 * 将数据库行转换为模板对象
 */
function rowToTemplate(row) {
    if (!row) return null;
    return {
        id: String(row.id),
        name: row.name || '未命名模板',
        columns: JSON.parse(row.columns || '[]'),
        rows: JSON.parse(row.rows || '[]'),
        filterField: row.filter_field || '',
        titleFields: JSON.parse(row.title_fields || '[]'),
        rules: JSON.parse(row.rules || '[]')
    };
}

/**
 * 将数据库行转换为提交对象
 */
function rowToSubmission(row) {
    return {
        templateId: String(row.template_id),
        date: row.date,
        userName: row.user_name,
        rowIndex: row.row_index,
        data: JSON.parse(row.data || '{}')
    };
}

/**
 * 获取指定模板的提交数据，按 tplId → date → user → rowIndex 嵌套
 */
function getSubmissionsByTemplate(tplId) {
    const { queryAll } = require('./database');
    try {
        const rows = queryAll("SELECT * FROM submissions WHERE template_id = ?", [String(tplId)]);
        const result = {};
        rows.forEach(row => {
            const s = rowToSubmission(row);
            if (!result[s.date]) result[s.date] = {};
            if (!result[s.date][s.userName]) result[s.date][s.userName] = {};
            result[s.date][s.userName][s.rowIndex] = s.data;
        });
        return result;
    } catch (err) {
        console.error('读取提交数据失败:', err);
        return {};
    }
}

/**
 * 获取所有提交数据，按 tplId → date → user → rowIndex 嵌套
 */
function getAllSubmissions() {
    const { queryAll } = require('./database');
    try {
        const rows = queryAll("SELECT * FROM submissions");
        const result = {};
        rows.forEach(row => {
            const s = rowToSubmission(row);
            if (!result[s.templateId]) result[s.templateId] = {};
            if (!result[s.templateId][s.date]) result[s.templateId][s.date] = {};
            if (!result[s.templateId][s.date][s.userName]) result[s.templateId][s.date][s.userName] = {};
            result[s.templateId][s.date][s.userName][s.rowIndex] = s.data;
        });
        return result;
    } catch (err) {
        console.error('读取提交数据失败:', err);
        return {};
    }
}

module.exports = { rowToTemplate, rowToSubmission, getSubmissionsByTemplate, getAllSubmissions };
