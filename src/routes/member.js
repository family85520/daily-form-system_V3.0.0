// src/routes/member.js
// 成员管理路由：保存成员列表

const { writeAuditLog } = require('../db/database');
const express = require('express');
const router = express.Router();
const { writeRateLimit } = require('../middleware/security');
const { queryAll, queryOne, getDB, saveDB } = require('../db/database');
const { zodValidate, memberSchema } = require('../middleware/zodValidate');

// --- 保存成员（无需认证） ---
router.post('/members', writeRateLimit(30, 60000), zodValidate(memberSchema), function (req, res) {
    try {
        const { tplId, members } = req.body;
        const tid = String(tplId || '0');
        const db = getDB();

        const existingMembers = getMembersByTemplate(tid);
        (members || []).forEach(m => {
            if (m && String(m).trim() && !existingMembers.includes(String(m).trim())) {
                try { db.run("INSERT INTO members (template_id, name) VALUES (?, ?)", [tid, String(m).trim()]); } catch (e) { /* ignore */ }
            }
        });
        existingMembers.forEach(m => {
            if (!(members || []).includes(m)) {
                db.run("DELETE FROM members WHERE template_id = ? AND name = ?", [tid, m]);
            }
        });
        saveDB();
        var mTpl = queryOne("SELECT name FROM templates WHERE id = ?", [tid]);
        writeAuditLog('member_save', 'member', '模板「' + mTpl.name + '」(ID: ' + tplId + ') ' + '保存成员成功 -> 成员数=' + (members ? members.length : 0), req.user || '', req.ip);
        res.json({ success: true });
    } catch (err) {
        console.error('保存成员失败:', err);
        res.status(500).json({ success: false, error: '保存成员失败' });
    }
});

// ===== 辅助函数 =====

function getMembersByTemplate(tplId) {
    try {
        const rows = queryAll("SELECT name FROM members WHERE template_id = ? ORDER BY id", [String(tplId)]);
        return rows.map(r => r.name);
    } catch (err) {
        console.error('读取模板成员失败:', err);
        return [];
    }
}

module.exports = router;
