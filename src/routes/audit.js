// src/routes/audit.js
// 审计日志路由：查询审计日志

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { queryAll } = require('../db/database');

// --- 审计日志查询（需要认证） ---
router.get('/audit', requireAuth, function (req, res) {
    try {
        var limit = Math.min(parseInt(req.query.limit) || 200, 2000);
        var category = req.query.category || '';
        var action = req.query.action || '';

        // 始终先获取所有分类和操作（不受筛选影响）
        var allCategories = queryAll("SELECT DISTINCT category FROM audit_log ORDER BY category");
        var allActions = queryAll("SELECT DISTINCT action FROM audit_log ORDER BY action");

        // 构建筛选查询
        var sql = "SELECT * FROM audit_log WHERE 1=1";
        var params = [];

        if (category) {
            sql += " AND category = ?";
            params.push(category);
        }
        if (action) {
            sql += " AND action = ?";
            params.push(action);
        }

        sql += " ORDER BY id DESC LIMIT ?";
        params.push(limit);

        var data = queryAll(sql, params);

        // 查询每个分类下的操作类型
        var categoryActions = {};
        var catActionRows = queryAll("SELECT DISTINCT category, action FROM audit_log ORDER BY category, action");
        catActionRows.forEach(function (row) {
            if (!categoryActions[row.category]) categoryActions[row.category] = [];
            if (categoryActions[row.category].indexOf(row.action) < 0) {
                categoryActions[row.category].push(row.action);
            }
        });

        // 查询每个操作所属的分类
        var actionCategories = {};
        catActionRows.forEach(function (row) {
            if (!actionCategories[row.action]) actionCategories[row.action] = [];
            if (actionCategories[row.action].indexOf(row.category) < 0) {
                actionCategories[row.action].push(row.category);
            }
        });

        res.json({
            success: true,
            data: data,
            categories: allCategories.map(c => c.category),
            actions: allActions.map(a => a.action),
            categoryActions: categoryActions,
            actionCategories: actionCategories
        });
    } catch (err) {
        console.error('查询审计日志失败:', err);
        res.status(500).json({ success: false, error: '查询失败' });
    }
});

// --- 清空审计日志（需要认证） ---
router.delete('/audit', requireAuth, function (req, res) {
    try {
        const { writeAuditLog } = require('../db/database');
        writeAuditLog('audit_clear', 'system', '清空审计日志', req.user || '', req.ip);

        const { getDB, saveDB } = require('../db/database');
        const db = getDB();
        db.run("DELETE FROM audit_log");
        saveDB();

        res.json({ success: true });
    } catch (err) {
        console.error('清空审计日志失败:', err);
        res.status(500).json({ success: false, error: '清空失败' });
    }
});

module.exports = router;
