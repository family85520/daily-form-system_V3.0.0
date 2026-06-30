// src/services/session.js
// Session 管理：内存缓存 + SQLite 持久化
// 启动时从数据库加载活跃 session 到内存缓存

const crypto = require('crypto');
const config = require('../config');
const { getDB, queryAll, queryOne, runSQL } = require('../db/database');

// 内存缓存（加速验证，避免每次查库）
var sessions = new Map();

/**
 * 从数据库加载活跃 session 到内存
 */
function loadSessionsFromDB() {
    try {
        const db = getDB();
        if (!db) return;
        const now = Date.now();
        const rows = queryAll(
            "SELECT token, ip, created_at, expires_at FROM sessions WHERE expires_at > ?",
            [now]
        );
        rows.forEach(row => {
            sessions.set(row.token, {
                ip: row.ip || '',
                createdAt: row.created_at,
                expiresAt: row.expires_at
            });
        });
        if (rows.length > 0) {
            console.log('[Session] 从数据库加载了 ' + rows.length + ' 个活跃会话');
        }
    } catch (err) {
        console.error('[Session] 加载会话失败:', err);
    }
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function createSession(ip) {
    var token = generateToken();
    var now = Date.now();
    var session = {
        ip: ip || '',
        createdAt: now,
        expiresAt: now + config.SESSION_DURATION
    };

    // 写入内存
    sessions.set(token, session);

    // 持久化到数据库
    try {
        const db = getDB();
        if (db) {
            db.run(
                "INSERT OR REPLACE INTO sessions (token, ip, created_at, expires_at) VALUES (?, ?, ?, ?)",
                [token, session.ip, session.createdAt, session.expiresAt]
            );
        }
    } catch (err) {
        console.error('[Session] 持久化失败:', err);
    }

    return token;
}

function validateSession(token) {
    if (!token || !sessions.has(token)) return null;
    var session = sessions.get(token);

    if (Date.now() > session.expiresAt) {
        sessions.delete(token);
        // 从数据库删除
        try {
            const db = getDB();
            if (db) db.run("DELETE FROM sessions WHERE token = ?", [token]);
        } catch (e) { /* ignore */ }
        return null;
    }

    // 滑动窗口：延长有效期
    session.expiresAt = Date.now() + config.SESSION_DURATION;
    sessions.set(token, session); // 更新内存

    // 持久化更新后的过期时间
    try {
        const db = getDB();
        if (db) {
            db.run("UPDATE sessions SET expires_at = ? WHERE token = ?",
                [session.expiresAt, token]);
        }
    } catch (e) { /* ignore */ }

    return session;
}

function deleteSession(token) {
    if (token) {
        sessions.delete(token);
        try {
            const db = getDB();
            if (db) db.run("DELETE FROM sessions WHERE token = ?", [token]);
        } catch (e) { /* ignore */ }
    }
}

// 清理过期会话（每分钟一次）
setInterval(function () {
    var now = Date.now();
    var expired = [];
    sessions.forEach(function (session, token) {
        if (now > session.expiresAt) expired.push(token);
    });
    expired.forEach(function (token) { sessions.delete(token); });

    // 清理数据库中的过期会话
    if (expired.length > 0) {
        try {
            const db = getDB();
            if (db) {
                db.run("DELETE FROM sessions WHERE expires_at <= ?", [now]);
            }
        } catch (e) { /* ignore */ }
    }

    if (sessions.size > config.SESSION_HARD_CAP) {
        var sorted = Array.from(sessions.entries()).sort(function (a, b) {
            return a[1].expiresAt - b[1].expiresAt;
        });
        sorted.slice(0, sessions.size - config.SESSION_HARD_CAP).forEach(function (item) {
            sessions.delete(item[0]);
        });
    }
}, 60000);

module.exports = {
    loadSessionsFromDB,
    createSession: createSession,
    validateSession: validateSession,
    deleteSession: deleteSession
};
