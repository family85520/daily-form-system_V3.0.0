// src/config/index.js
// 集中管理所有配置常量

const path = require('path');

module.exports = {
    // 服务端口
    PORT: process.env.PORT || 3000,

    // 数据目录
    DATA_DIR: path.join(__dirname, '../../data'),
    DB_FILENAME: 'app.db',

    // 会话配置
    SESSION_DURATION: 30 * 60 * 1000, // 30分钟滑动窗口
    SESSION_HARD_CAP: 500, // 内存 Map 最大会话数

    // 速率限制配置
    RATE_LIMIT: {
        LOGIN: { maxAttempts: 10, windowMs: 60000 },
        WRITE: { maxAttempts: 60, windowMs: 60000 },
        TEMPLATE_CREATE: { maxAttempts: 20, windowMs: 60000 },
        TEMPLATE_UPDATE: { maxAttempts: 30, windowMs: 60000 },
        TEMPLATE_DELETE: { maxAttempts: 10, windowMs: 60000 },
        SUBMISSION: { maxAttempts: 60, windowMs: 60000 },
        MEMBER: { maxAttempts: 30, windowMs: 60000 },
        DATA_SAVE: { maxAttempts: 30, windowMs: 60000 },
        RESET: { maxAttempts: 3, windowMs: 300000 },
        PASSWORD: { maxAttempts: 10, windowMs: 60000 }
    },

    // 速率限制硬上限
    RATE_LIMIT_HARD_CAP: 20000,

    // 备份配置
    BACKUP_RETENTION_DAYS: 7,
    BACKUP_INTERVAL_MS: 3600000, // 1小时

    // 审计日志配置
    AUDIT_RETENTION_DAYS: 90,
    AUDIT_CLEANUP_INTERVAL_MS: 86400000, // 24小时

    // 密码配置
    MIN_PASSWORD_LENGTH: 6,
    SALT_ROUNDS: 10,
    DEFAULT_PASSWORD: '1234',

    // 导出配置
    EXPORT_MAX_ROWS: 50000
};
