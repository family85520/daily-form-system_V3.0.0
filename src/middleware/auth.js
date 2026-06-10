// src/middleware/auth.js
// 从 server.js 提取并增强：认证中间件（分层）
// 🔒 1：统计/管理需要认证，填报/历史不需要

const { validateSession } = require('../services/session');

// 必须登录（用于：模板修改/删除、审计日志、密码修改、数据重置、导出）
function requireAuth(req, res, next) {
    var token = req.headers['x-auth-token'];
    var session = validateSession(token);

    if (!session) {
        return res.status(401).json({ success: false, error: '请先登录' });
    }

    req.session = session;
    next();
}

// 可选登录（用于：数据读写、模板创建、填报提交 —— 无需登录即可操作）
function optionalAuth(req, res, next) {
    var token = req.headers['x-auth-token'];
    var session = validateSession(token);

    if (session) {
        req.session = session;
    }
    next();
}

module.exports = {
    requireAuth,
    optionalAuth
};
