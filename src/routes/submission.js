// src/routes/submission.js
// 提交数据路由：保存提交、删除提交

const { writeAuditLog, queryOne } = require('../db/database');
const express = require('express');
const router = express.Router();
const { writeRateLimit } = require('../middleware/security');
const { validateRequired } = require('../middleware/validate');
const { getDB, saveDB } = require('../db/database');
const { logAudit } = require('../db/migrations');

// --- 提交数据（无需认证） ---
router.post('/submission', writeRateLimit(60, 60000), validateRequired(['tplId', 'date', 'user', 'submissions']), function (req, res) {
    try {
        const { tplId, date, user, submissions } = req.body;
        const tid = String(tplId);
        const db = getDB();

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ success: false, error: '日期格式不正确' });
        }

        for (const [ri, data] of Object.entries(submissions)) {
            if (!data || typeof data !== 'object') continue;
            db.run(
                "DELETE FROM submissions WHERE template_id=? AND date=? AND user_name=? AND row_index=?",
                [tid, date, user, parseInt(ri)]
            );
            db.run(
                "INSERT INTO submissions (template_id, date, user_name, row_index, data, updated_at) VALUES (?,?,?,?,?,datetime('now','localtime'))",
                [tid, date, user, parseInt(ri), JSON.stringify(data)]
            );
        }
        saveDB();
        var sTpl = queryOne("SELECT name FROM templates WHERE id = ?", [tid]);
        var tplName = (sTpl && sTpl.name) || tid;
        logAudit('submission', tplId, date + ' ' + user, req.ip);
        writeAuditLog('submission_save', 'data', '保存填报数据: 模板「' + tplName + '」「日期=' + date + ' 用户=' + user + '」', req.user || '', req.ip);
        res.json({ success: true });
    } catch (err) {
        console.error('保存提交失败:', err);
        res.status(500).json({ success: false, error: '保存提交失败' });
    }
});

// --- 删除提交（无需认证） ---
router.delete('/submission', writeRateLimit(60, 60000), function (req, res) {
    try {
        var tplId = String(req.query.tplId || '');
        var date = req.query.date || '';
        var user = req.query.user || '';
        var ri = parseInt(req.query.rowIndex);
        const db = getDB();

        if (!tplId || !date || isNaN(ri)) {
            return res.status(400).json({ success: false, error: '参数不完整' });
        }
        db.run("DELETE FROM submissions WHERE template_id=? AND date=? AND user_name=? AND row_index=?",
            [tplId, date, user, ri]);
        saveDB();
        var dTpl = queryOne("SELECT name FROM templates WHERE id = ?", [tplId]);
        var tplName = (dTpl && dTpl.name) || tplId;
        logAudit('submission_delete', tplId, date + ' ' + user + ' #' + (ri + 1), req.ip);
        writeAuditLog('submission_delete', 'data', '删除填报数据: 模板「' + tplName + '」「日期=' + date + ' 用户=' + user + ' 行=' + ri + '」', req.user || '', req.ip);
        res.json({ success: true });
    } catch (err) {
        console.error('删除提交失败:', err);
        res.status(500).json({ success: false, error: '删除失败' });
    }
});

module.exports = router;
