// src/db/database.js
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'app.db');

let db = null;
let SQL = null;
let saveTimeout = null;

// 防抖保存
function saveDB() {
    if (!db) return;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        try {
            const data = db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(dbPath, buffer);
        } catch (err) {
            console.error('[数据库] 保存失败:', err);
        }
    }, 100);
}

// 立即保存（跳过防抖）
function saveDBNow() {
    if (!db) return;
    if (saveTimeout) { clearTimeout(saveTimeout); saveTimeout = null; }
    try {
        fs.writeFileSync(dbPath, Buffer.from(db.export()));
    } catch (err) {
        console.error('[数据库] 强制保存失败:', err);
    }
}

// 进程退出钩子
const exitSignals = ['exit', 'SIGINT', 'SIGTERM', 'SIGUSR2', 'uncaughtException'];
exitSignals.forEach(sig => {
    process.on(sig, (code) => {
        saveDBNow();
        if (sig === 'exit') process.exit(code);
    });
});

// 查询辅助函数
function queryOne(sql, params) {
    if (!db) return null;
    try {
        const stmt = db.prepare(sql);
        if (params) stmt.bind(params);
        if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
        }
        stmt.free();
        return null;
    } catch (err) {
        console.error('[查询] queryOne 错误:', err.message, sql);
        return null;
    }
}

function queryAll(sql, params) {
    if (!db) return [];
    try {
        const stmt = db.prepare(sql);
        if (params) stmt.bind(params);
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    } catch (err) {
        console.error('[查询] queryAll 错误:', err.message, sql);
        return [];
    }
}

// 事务封装
async function withTransaction(fn) {
    try {
        db.run("BEGIN TRANSACTION");
        await fn();
        db.run("COMMIT");
    } catch (err) {
        db.run("ROLLBACK");
        throw err;
    }
}

// 数据库初始化
async function initDB() {
    try {
        SQL = await initSqlJs();

        if (fs.existsSync(dbPath)) {
            const fileBuffer = fs.readFileSync(dbPath);
            db = new SQL.Database(fileBuffer);
        } else {
            db = new SQL.Database();
        }
        // 创建审计日志表（兼容旧表结构）
        // 先检查旧表是否存在
        var oldTable = queryOne("SELECT name FROM sqlite_master WHERE type='table' AND name='audit_log'");
        if (oldTable) {
            // 检查旧表是否有 time 列
            var oldCols = queryAll("PRAGMA table_info(audit_log)");
            var oldColNames = oldCols.map(c => c.name);
            if (oldColNames.indexOf('time') < 0) {
                // 旧表结构不兼容，删除重建
                db.run("DROP TABLE IF EXISTS audit_log");
                console.log('[数据库] 旧 audit_log 表结构不兼容，已重建');
            }
        }

        db.run(`
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                time TEXT NOT NULL,
                action TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'system',
                user TEXT DEFAULT '',
                detail TEXT DEFAULT '',
                ip TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now', 'localtime'))
            )
        `);

        db.run("CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action)");
        db.run("CREATE INDEX IF NOT EXISTS idx_audit_category ON audit_log(category)");
        db.run("CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(time)");

        // 检查并补充缺失的列
        try {
            var cols = queryAll("PRAGMA table_info(audit_log)");
            var colNames = cols.map(c => c.name);
            if (colNames.indexOf('category') < 0) {
                db.run("ALTER TABLE audit_log ADD COLUMN category TEXT NOT NULL DEFAULT 'system'");
            }
            if (colNames.indexOf('user') < 0) {
                db.run("ALTER TABLE audit_log ADD COLUMN user TEXT DEFAULT ''");
            }
            if (colNames.indexOf('ip') < 0) {
                db.run("ALTER TABLE audit_log ADD COLUMN ip TEXT DEFAULT ''");
            }
            if (colNames.indexOf('created_at') < 0) {
                db.run("ALTER TABLE audit_log ADD COLUMN created_at TEXT DEFAULT ''");
            }
        } catch (e) {
            console.log('[数据库] 补充列检查跳过:', e.message);
        }

        db.run("CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action)");
        db.run("CREATE INDEX IF NOT EXISTS idx_audit_category ON audit_log(category)");
        db.run("CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(time)");
        console.log('[数据库] 初始化完成');
        return db;
    } catch (err) {
        console.error('[数据库] 初始化失败:', err);
        throw err;
    }
}

// 获取数据库实例
function getDB() {
    return db;
}

// 审计日志写入
function writeAuditLog(action, category, detail, user, ip) {
    if (!db) return;
    try {
        const now = new Date();
        const timeStr = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + ' ' +
            String(now.getHours()).padStart(2, '0') + ':' +
            String(now.getMinutes()).padStart(2, '0') + ':' +
            String(now.getSeconds()).padStart(2, '0');

        db.run(
            "INSERT INTO audit_log (time, action, category, user, detail, ip) VALUES (?, ?, ?, ?, ?, ?)",
            [timeStr, action, category || 'system', user || '', detail || '', ip || '']
        );
        saveDB();
    } catch (err) {
        console.error('[审计] 写入日志失败:', err);
    }
}

// 根据模板ID获取模板名称
function getTemplateName(tplId) {
    if (!db || !tplId) return '';
    try {
        var row = queryOne("SELECT name FROM templates WHERE id = ?", [String(tplId)]);
        return row ? row.name : '';
    } catch (e) {
        return '';
    }
}

module.exports = {
    initDB,
    getDB,
    saveDB,
    saveDBNow,
    queryOne,
    queryAll,
    withTransaction,
    writeAuditLog,
    getTemplateName,
    dbPath,
    dataDir
};
