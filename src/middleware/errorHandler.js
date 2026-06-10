// src/middleware/errorHandler.js
// 新增：统一错误处理中间件（原 server.js 中无此机制）

const { logAudit } = require('../db/migrations');

// Express 错误处理中间件（4 参数签名）
function errorHandler(err, req, res, next) {
    console.error('[错误]', err.message);
    logAudit('error', req.path, err.message, req.ip);

    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? '服务器内部错误'
            : err.message
    });
}

module.exports = errorHandler;
