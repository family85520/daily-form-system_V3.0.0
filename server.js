// server.js
// 每日数据填报系统 — 入口文件（支持双轨并行）

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./src/config');
const { initDB } = require('./src/db/database');
const { migrateData } = require('./src/db/migrations');
const { startAutoBackup, startAuditCleanup } = require('./src/db/backup');
const { loadSessionsFromDB } = require('./src/services/session');
const { securityHeaders } = require('./src/middleware/security');
const errorHandler = require('./src/middleware/errorHandler');

// 路由模块
const authRoutes = require('./src/routes/auth');
const dataRoutes = require('./src/routes/data');
const templateRoutes = require('./src/routes/template');
const submissionRoutes = require('./src/routes/submission');
const memberRoutes = require('./src/routes/member');
const exportRoutes = require('./src/routes/export');
const auditRoutes = require('./src/routes/audit');

const app = express();

// ===== 双轨并行：前端版本开关 =====
let frontendVersion = process.env.FRONTEND_VERSION || 'v2';

function getFrontendDir() {
    return frontendVersion === 'v2'
        ? path.join(__dirname, 'dist')
        : path.join(__dirname, 'public');
}

function getIndexFile() {
    return frontendVersion === 'v2'
        ? path.join(__dirname, 'dist', 'index.html')
        : path.join(__dirname, 'public', 'index.html');
}

// ===== 中间件 =====
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(securityHeaders);

// 动态静态文件（每次请求重新评估目录，支持运行时切换）
app.use((req, res, next) => {
    express.static(getFrontendDir(), {
        maxAge: 0,           // 禁用缓存，避免切换后加载旧文件
        etag: false,
        lastModified: false,
    })(req, res, next);
});

// ===== 双轨并行：运行时切换 API =====
app.get('/api/admin/frontend-version', (req, res) => {
    res.json({ success: true, version: frontendVersion });
});

app.post('/api/admin/switch-frontend', (req, res) => {
    const { version } = req.body;
    if (version !== 'v1' && version !== 'v2') {
        return res.json({ success: false, error: '版本只能是 v1 或 v2' });
    }
    const prev = frontendVersion;
    frontendVersion = version;
    console.log(`\n  [!] 前端版本已切换: ${prev} -> ${version}`);
    res.json({ success: true, message: `前端已切换到 ${version}`, prev, current: version });
});

// ===== 路由 =====
app.use('/api', authRoutes);
app.use('/api', dataRoutes);
app.use('/api', templateRoutes);
app.use('/api', submissionRoutes);
app.use('/api', memberRoutes);
app.use('/api', exportRoutes);
app.use('/api', auditRoutes);

// ===== 健康检查端点 =====
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// ===== SPA fallback（动态评估） =====
app.get('/{*path}', (req, res) => {
    res.sendFile(getIndexFile());
});

// ===== 统一错误处理 =====
app.use(errorHandler);

// ===== 启动 =====
async function start() {
    try {
        console.log('\n正在初始化数据库...');
        await initDB();
        await migrateData();

        // 从数据库加载活跃会话
        loadSessionsFromDB();

        startAutoBackup();
        startAuditCleanup();

        app.listen(config.PORT, '0.0.0.0', () => {
            console.log('');
            console.log('  ==========================================');
            console.log('      每日数据填报系统 已启动');
            console.log('  ==========================================');
            console.log('  本机访问: http://localhost:' + config.PORT);
            console.log('  前端版本: ' + frontendVersion + ' (v1=原版, v2=Vue3)');
            console.log('  数据库:   ./data/app.db');
            console.log('  备份目录: ./data/backups/');
            console.log('  ==========================================');
            console.log('');
        });
    } catch (err) {
        console.error('启动失败:', err);
        process.exit(1);
    }
}

start();
