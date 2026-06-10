// src/db/migrations.js
const { getDB, queryOne, saveDB } = require('./database');
const { hashPassword } = require('../services/password');

function createTables() {
    const db = getDB();
    if (!db) return;

    db.run(`CREATE TABLE IF NOT EXISTS system (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
    db.run(`
        CREATE TABLE IF NOT EXISTS templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            columns TEXT NOT NULL DEFAULT '[]',
            rows TEXT NOT NULL DEFAULT '[]',
            filter_field TEXT DEFAULT '',
            title_fields TEXT DEFAULT '[]',
            rules TEXT DEFAULT '[]',
            created_at TEXT DEFAULT (datetime('now','localtime')),
            updated_at TEXT DEFAULT (datetime('now','localtime'))
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id TEXT NOT NULL DEFAULT '0',
            name TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id TEXT NOT NULL DEFAULT '0',
            date TEXT NOT NULL,
            user_name TEXT NOT NULL,
            row_index INTEGER NOT NULL,
            data TEXT NOT NULL DEFAULT '{}',
            updated_at TEXT DEFAULT (datetime('now','localtime'))
        )
    `);
    db.run(
        "CREATE TABLE IF NOT EXISTS audit_log (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
        "action TEXT NOT NULL, " +
        "target TEXT DEFAULT '', " +
        "detail TEXT DEFAULT '', " +
        "ip TEXT DEFAULT '', " +
        "created_at TEXT DEFAULT (datetime('now','localtime')))"
    );
}

function createIndexes() {
    const db = getDB();
    if (!db) return;

    try { db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_sub_unique ON submissions(template_id, date, user_name, row_index)`); } catch (e) { /* ignore */ }
    try { db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_member_name ON members(template_id, name)`); } catch (e) { /* ignore */ }
    try { db.run(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at)`); } catch (e) { /* ignore */ }
}

async function migrateData() {
    const db = getDB();
    if (!db) return;

    // 检查旧表结构
    let needRebuild = false;
    try {
        const pragma = db.exec("PRAGMA table_info(templates)");
        if (pragma.length && pragma[0].values.length) {
            const idCol = pragma[0].values.find(r => r[1] === 'id');
            if (idCol && idCol[2] === 'INTEGER') {
                needRebuild = true;
                console.log('[迁移] 检测到旧表结构，需要重建为 TEXT 类型');
            }
        }
    } catch (e) { /* 表不存在 */ }

    if (needRebuild) {
        let oldTemplates = [], oldMembers = [], oldSubmissions = [];
        try {
            const r = db.exec("SELECT * FROM templates");
            if (r.length) {
                oldTemplates = r[0].values.map(row => {
                    const o = {};
                    r[0].columns.forEach((c, i) => { o[c] = row[i]; });
                    return o;
                });
            }
        } catch (e) { /* ignore */ }
        try {
            const r = db.exec("SELECT * FROM members");
            if (r.length) {
                oldMembers = r[0].values.map(row => {
                    const o = {};
                    r[0].columns.forEach((c, i) => { o[c] = row[i]; });
                    return o;
                });
            }
        } catch (e) { /* ignore */ }
        try {
            const r = db.exec("SELECT * FROM submissions");
            if (r.length) {
                oldSubmissions = r[0].values.map(row => {
                    const o = {};
                    r[0].columns.forEach((c, i) => { o[c] = row[i]; });
                    return o;
                });
            }
        } catch (e) { /* ignore */ }

        db.run("DROP TABLE IF EXISTS templates");
        db.run("DROP TABLE IF EXISTS members");
        db.run("DROP TABLE IF EXISTS submissions");
        db.run("DROP INDEX IF EXISTS idx_sub_unique");
        db.run("DROP INDEX IF EXISTS idx_member_name");

        createTables();

        oldTemplates.forEach(t => {
            const tid = t.id != null ? String(t.id) : ('tpl_' + Date.now());
            try {
                db.run(
                    "INSERT INTO templates (id, name, columns, rows, filter_field, title_fields, created_at, updated_at, rules) VALUES (?,?,?,?,?,?,?,?,?)",
                    [tid, t.name || '未命名', t.columns || '[]', t.rows || '[]', t.filter_field || '', t.title_fields || '[]', t.created_at || '', t.updated_at || '', t.rules || '[]']
                );
            } catch (e) { console.error('恢复模板失败:', e.message); }
        });
        oldMembers.forEach(m => {
            const tid = m.template_id != null ? String(m.template_id) : '0';
            try {
                db.run("INSERT INTO members (template_id, name, created_at) VALUES (?,?,?)", [tid, m.name || '', m.created_at || '']);
            } catch (e) { /* ignore */ }
        });
        oldSubmissions.forEach(s => {
            const tid = s.template_id != null ? String(s.template_id) : '0';
            try {
                db.run(
                    "INSERT INTO submissions (template_id, date, user_name, row_index, data, updated_at) VALUES (?,?,?,?,?,?)",
                    [tid, s.date || '', s.user_name || '', parseInt(s.row_index) || 0, s.data || '{}', s.updated_at || '']
                );
            } catch (e) { /* ignore */ }
        });

        console.log(`[迁移] 已恢复 ${oldTemplates.length} 个模板, ${oldMembers.length} 条成员, ${oldSubmissions.length} 条提交`);
    } else {
        createTables();
        // 迁移：检查旧表是否缺少 rules 列
        try {
            var pragma = db.exec("PRAGMA table_info(templates)");
            if (pragma.length && pragma[0].values.length) {
                var hasRules = pragma[0].values.some(function(r){ return r[1] === 'rules'; });
                if (!hasRules) {
                    db.run("ALTER TABLE templates ADD COLUMN rules TEXT DEFAULT '[]'");
                    console.log('[迁移] 已添加 rules 列');
                }
            }
        } catch (e) { /* ignore */ }
    }

    createIndexes();

    // 初始化管理员密码
    const pwdRow = queryOne("SELECT value FROM system WHERE key = 'adminPwd'");
    if (!pwdRow || !pwdRow.value) {
        const defaultHash = await hashPassword('1234');
        db.run("INSERT INTO system (key, value) VALUES (?, ?)", ['adminPwd', defaultHash]);
        db.run("INSERT INTO system (key, value) VALUES (?, ?)", ['pwdIsHashed', '2']);
    }

    saveDB();
}

function logAudit(action, target, detail, ip) {
    const db = getDB();
    if (!db) return;

    try {
        db.run(
            "INSERT INTO audit_log (action, target, detail, ip) VALUES (?,?,?,?)",
            [action || '', target || '', detail || '', ip || '']
        );
    } catch (e) {
        // 静默失败，不影响主流程
    }
}

module.exports = {
    createTables,
    createIndexes,
    migrateData,
    logAudit
};
