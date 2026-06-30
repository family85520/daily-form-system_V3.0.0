// src/middleware/errorHandler.js
// 统一错误处理中间件

const { writeAuditLog } = require('../db/database');

// Express 错误处理中间件（4 参数签名）
function errorHandler(err, req, res, next) {
    console.error('[错误]', err.message);
    writeAuditLog('error', 'system', err.message, req.user || '', req.ip);

    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV !== 'production'
            ? err.message
            : '服务器内部错误'
    });
}

module.exports = errorHandler;
