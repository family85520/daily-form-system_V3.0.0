// src/services/session.js
const crypto = require('crypto');
const config = require('../config');

var sessions = new Map();

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function createSession(ip) {
    var token = generateToken();
    sessions.set(token, {
        ip: ip,
        createdAt: Date.now(),
        expiresAt: Date.now() + config.SESSION_DURATION
    });
    return token;
}

function validateSession(token) {
    if (!token || !sessions.has(token)) return null;
    var session = sessions.get(token);
    if (Date.now() > session.expiresAt) {
        sessions.delete(token);
        return null;
    }
    session.expiresAt = Date.now() + config.SESSION_DURATION;
    return session;
}

function deleteSession(token) {
    if (token) sessions.delete(token);
}

// 清理过期会话
setInterval(function () {
    var now = Date.now();
    var expired = [];
    sessions.forEach(function (session, token) {
        if (now > session.expiresAt) expired.push(token);
    });
    expired.forEach(function (token) { sessions.delete(token); });

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
    createSession: createSession,
    validateSession: validateSession,
    deleteSession: deleteSession
};
