// src/routes/data.js
// 数据读写路由：获取全量数据、批量保存

const { writeAuditLog } = require('../db/database');
const express = require('express');
const router = express.Router();
const { writeRateLimit } = require('../middleware/security');
const { queryAll, getDB, saveDB, withTransaction } = require('../db/database');

// --- 数据读取（无需认证） ---
router.get('/data', (req, res) => {
    try {
        res.json({ success: true, data: buildFullData() });
    } catch (err) {
        console.error('获取数据失败:', err);
        res.status(500).json({ success: false, error: '获取数据失败' });
    }
});

// --- 批量保存（模板+成员+提交数据，兼容前端 svFull） ---
router.post('/data', writeRateLimit(30, 60000), async function (req, res) {
    try {
        const { tpls, members, sub } = req.body;
        const db = getDB();

        await withTransaction(async () => {

            // 模板写入
            if (Array.isArray(tpls)) {
                tpls.forEach(tpl => {
                    if (!tpl.id) return;
                    const tid = String(tpl.id);
                    if (typeof tpl.name !== 'string' || tpl.name.length > 200) return;
                    if (!Array.isArray(tpl.columns)) return;

                    const existing = queryOne("SELECT id FROM templates WHERE id = ?", [tid]);
                    if (existing) {
                        db.run(
                            "UPDATE templates SET name=?, columns=?, rows=?, filter_field=?, title_fields=?, rules=?, updated_at=datetime('now','localtime') WHERE id=?",
                            [tpl.name, JSON.stringify(tpl.columns), JSON.stringify(tpl.rows || []), tpl.filterField || '', JSON.stringify(tpl.titleFields || []), JSON.stringify(tpl.rules || []), tid]
                        );
                    } else {
                        db.run(
                            "INSERT INTO templates (id, name, columns, rows, filter_field, title_fields, rules) VALUES (?,?,?,?,?,?,?)",
                            [tid, tpl.name, JSON.stringify(tpl.columns), JSON.stringify(tpl.rows || []), tpl.filterField || '', JSON.stringify(tpl.titleFields || []), JSON.stringify(tpl.rules || [])]
                        );
                    }
                });
            }

            // 成员写入
            if (members && typeof members === 'object' && !Array.isArray(members)) {
                for (const [tplId, memberList] of Object.entries(members)) {
                    if (!Array.isArray(memberList)) continue;
                    const tid = String(tplId);
                    const existingMembers = getMembersByTemplate(tid);
                    memberList.forEach(m => {
                        if (m && String(m).trim() && !existingMembers.includes(String(m).trim())) {
                            try { db.run("INSERT INTO members (template_id, name) VALUES (?, ?)", [tid, String(m).trim()]); } catch (e) { /* ignore */ }
                        }
                    });
                    existingMembers.forEach(m => {
                        if (!memberList.includes(m)) {
                            db.run("DELETE FROM members WHERE template_id = ? AND name = ?", [tid, m]);
                        }
                    });
                }
            }

            // 提交数据写入
            if (sub && typeof sub === 'object') {
                for (const [tplId, dates] of Object.entries(sub)) {
                    if (!dates || typeof dates !== 'object') continue;
                    const tid = String(tplId);
                    for (const [date, users] of Object.entries(dates)) {
                        for (const [user, rows] of Object.entries(users)) {
                            for (const [ri, data] of Object.entries(rows)) {
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
                        }
                    }
                }
            }

        }); // ← 事务结束

        saveDB();
        var tplCount = Array.isArray(tpls) ? tpls.length : 0;
        var memberCount = (members && typeof members === 'object') ? Object.keys(members).length : 0;
        var subCount = (sub && typeof sub === 'object') ? Object.keys(sub).length : 0;
        writeAuditLog('data_save', 'data', '批量保存数据: 模板=' + tplCount + '个 成员组=' + memberCount + '个 提交=' + subCount + '个模板', req.user || '', req.ip);
        res.json({ success: true });
    } catch (err) {
        console.error('保存数据失败:', err);
        res.status(500).json({ success: false, error: '保存数据失败' });
    }
});

// ===== 辅助函数 =====

function buildFullData() {
    return {
        ap: '****',
        tpls: getAllTemplates(),
        members: getAllMembers(),
        sub: getAllSubmissions()
    };
}

function getAllTemplates() {
    try {
        const rows = queryAll("SELECT * FROM templates ORDER BY created_at DESC");
        return rows.map(rowToTemplate);
    } catch (err) {
        console.error('读取模板列表失败:', err);
        return [];
    }
}

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

function getAllMembers() {
    try {
        const rows = queryAll("SELECT template_id, name FROM members ORDER BY id");
        const result = {};
        rows.forEach(r => {
            const tplId = String(r.template_id);
            if (!result[tplId]) result[tplId] = [];
            result[tplId].push(r.name);
        });
        return result;
    } catch (err) {
        console.error('读取成员列表失败:', err);
        return {};
    }
}

function getMembersByTemplate(tplId) {
    try {
        const rows = queryAll("SELECT name FROM members WHERE template_id = ? ORDER BY id", [String(tplId)]);
        return rows.map(r => r.name);
    } catch (err) {
        console.error('读取模板成员失败:', err);
        return [];
    }
}

function getAllSubmissions() {
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

function rowToSubmission(row) {
    return {
        templateId: String(row.template_id),
        date: row.date,
        userName: row.user_name,
        rowIndex: row.row_index,
        data: JSON.parse(row.data || '{}')
    };
}

module.exports = router;
