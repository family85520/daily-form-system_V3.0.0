// src/routes/template.js
// 模板管理路由：创建、更新、删除模板、JSON导入

const { writeAuditLog } = require('../db/database');
const express = require('express');
const router = express.Router();
const { writeRateLimit } = require('../middleware/security');
const { queryOne, queryAll, getDB, saveDB } = require('../db/database');
const { zodValidate, templateSchema, deleteTemplateSchema } = require('../middleware/zodValidate');

// --- 创建模板（无需认证） ---
router.post('/template', writeRateLimit(20, 60000), zodValidate(templateSchema), function (req, res) {
    try {
        const tpl = req.body;
        const tid = tpl.id ? String(tpl.id) : ('tpl_' + Date.now());
        const db = getDB();

        db.run(
            "INSERT OR REPLACE INTO templates (id, name, columns, rows, filter_field, title_fields, rules) VALUES (?,?,?,?,?,?,?)",
            [tid, tpl.name, JSON.stringify(tpl.columns || []), JSON.stringify(tpl.rows || []), tpl.filterField || '', JSON.stringify(tpl.titleFields || []), JSON.stringify(tpl.rules || [])]
        );
        saveDB();
        var logAction = 'template_create';
        var logPrefix = '创建模板';
        if (tpl.source === 'json_import') {
          logAction = '导入模板';
          logPrefix = 'JSON导入模板';
        } else if (tpl.source === 'excel_import') {
          logAction = '导入模板';
          logPrefix = 'Excel导入模板';
        }
        writeAuditLog(logAction, 'template', logPrefix + '「' + (tpl.name || '未命名') + '」(ID: ' + tid + ') 成功', req.user || '', req.ip);
        res.json({ success: true, id: tid });
    } catch (err) {
        console.error('创建模板失败:', err);
        res.status(500).json({ success: false, error: '创建模板失败' });
    }
});

// --- 更新模板（无需认证） ---
router.put('/template/:id', writeRateLimit(30, 60000), zodValidate(templateSchema), function (req, res) {
    try {
        const tplId = String(req.params.id);
        const tpl = req.body;
        const db = getDB();

        db.run(
            "UPDATE templates SET name=?, columns=?, rows=?, filter_field=?, title_fields=?, rules=?, updated_at=datetime('now','localtime') WHERE id=?",
            [tpl.name, JSON.stringify(tpl.columns || []), JSON.stringify(tpl.rows || []), tpl.filterField || '', JSON.stringify(tpl.titleFields || []), JSON.stringify(tpl.rules || []), tplId]
        );

        // 字段名变更时同步更新 submissions 表
        var renames = tpl.fieldRenames;
        if (renames && typeof renames === 'object') {
            var keys = Object.keys(renames);
            if (keys.length) {
                var subs = queryAll("SELECT id, data FROM submissions WHERE template_id = ?", [tplId]);
                subs.forEach(function (sub) {
                    var data = JSON.parse(sub.data || '{}');
                    var changed = false;
                    keys.forEach(function (oldKey) {
                        var newKey = renames[oldKey];
                        if (data.hasOwnProperty(oldKey)) {
                            data[newKey] = data[oldKey];
                            delete data[oldKey];
                            changed = true;
                        }
                    });
                    if (changed) {
                        db.run("UPDATE submissions SET data = ? WHERE id = ?",
                            [JSON.stringify(data), sub.id]);
                    }
                });
                writeAuditLog('field_rename', 'template', '字段重命名: ' + keys.map(function (k) { return k + '→' + renames[k]; }).join(', '), req.user || '', req.ip);
            }
        }

        saveDB();
        var updTpl = queryOne("SELECT name FROM templates WHERE id = ?", [tplId]);
        writeAuditLog('template_update', 'template', '更新模板「' + (updTpl && updTpl.name) + '」(ID: ' + tplId + ') 成功', req.user || '', req.ip);
        res.json({ success: true });
    } catch (err) {
        console.error('更新模板失败:', err);
        res.status(500).json({ success: false, error: '更新模板失败' });
    }
});

// --- 删除模板（无需认证） ---
router.delete('/template/:id', writeRateLimit(10, 60000), zodValidate(deleteTemplateSchema), function (req, res) {
    try {
        const tplId = String(req.params.id);
        const db = getDB();

        // 先查询模板名称（删除后就查不到了）
        var delTpl = queryOne("SELECT name FROM templates WHERE id = ?", [tplId]);
        var tplName = (delTpl && delTpl.name) || tplId;

        db.run("DELETE FROM templates WHERE id = ?", [tplId]);
        db.run("DELETE FROM submissions WHERE template_id = ?", [tplId]);
        db.run("DELETE FROM members WHERE template_id = ?", [tplId]);
        saveDB();
        writeAuditLog('template_delete', 'template', '删除模板「' + tplName + '」(ID: ' + tplId + ') 成功', req.user || '', req.ip);
        res.json({ success: true });
    } catch (err) {
        console.error('删除模板失败:', err);
        res.status(500).json({ success: false, error: '删除模板失败' });
    }
});

// --- 导入 JSON 模板（无需认证） ---
router.post('/import/json', (req, res) => {
    try {
        const tpl = req.body;
        if (!tpl || !tpl.columns || !tpl.rows) return res.json({ success: false, error: '格式不正确' });
        if (!Array.isArray(tpl.columns) || !Array.isArray(tpl.rows)) {
            return res.json({ success: false, error: 'columns 和 rows 必须是数组' });
        }
        const tid = tpl.id ? String(tpl.id) : ('tpl_' + Date.now());
        const db = getDB();

        db.run(
            "INSERT INTO templates (id, name, columns, rows, filter_field, title_fields, rules) VALUES (?,?,?,?,?,?,?)",
            [tid, tpl.name || '未命名', JSON.stringify(tpl.columns), JSON.stringify(tpl.rows), tpl.filterField || '', JSON.stringify(tpl.titleFields || []), JSON.stringify(tpl.rules || [])]
        );
        saveDB();
        writeAuditLog('template_create', 'template', 'JSON导入模板「' + (tpl.name || '未命名') + '」(ID: ' + tid + ') 成功', req.user || '', req.ip);
        res.json({ success: true, id: tid });
    } catch (err) {
        console.error('导入JSON失败:', err);
        res.status(500).json({ success: false, error: '导入JSON失败' });
    }
});

// --- 记录导出审计日志（前端JSON导出时调用） ---
router.post('/template/export-log', function (req, res) {
    try {
        const { tplId, tplName } = req.body;
        writeAuditLog('export', 'data', '导出JSON模板「' + (tplName || tplId) + '」(ID: ' + tplId + ') 成功', req.user || '', req.ip);
        res.json({ success: true });
    } catch (err) {
        console.error('记录导出日志失败:', err);
        res.json({ success: true }); // 不影响导出流程
    }
});

module.exports = router;
