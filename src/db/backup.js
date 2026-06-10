// src/db/backup.js
const path = require('path');
const fs = require('fs');
const { getDB, queryOne, saveDB, dbPath, dataDir } = require('./database');

function startAutoBackup() {
    const backupDir = path.join(dataDir, 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const doBackup = () => {
        try {
            if (!fs.existsSync(dbPath)) return;

            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const backupPath = path.join(backupDir, `app_${dateStr}.db`);

            // 每天只备份一次
            if (!fs.existsSync(backupPath)) {
                fs.copyFileSync(dbPath, backupPath);
                console.log('[备份] 已创建:', backupPath);

                // 只保留最近 7 天的备份
                const files = fs.readdirSync(backupDir)
                    .filter(f => f.startsWith('app_') && f.endsWith('.db'))
                    .sort();
                while (files.length > 7) {
                    const oldFile = files.shift();
                    fs.unlinkSync(path.join(backupDir, oldFile));
                    console.log('[备份] 已清理旧备份:', oldFile);
                }
            }
        } catch (err) {
            console.error('[备份] 失败:', err);
        }
    };

    // 启动时立即检查一次
    doBackup();
    // 之后每小时检查一次
    setInterval(doBackup, 3600000);
}

function startAuditCleanup() {
    const RETENTION_DAYS = 90;

    const doCleanup = () => {
        try {
            var cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
            var cutoffStr = cutoff.toISOString().replace('T', ' ').slice(0, 19);

            var row = queryOne(
                "SELECT COUNT(*) as cnt FROM audit_log WHERE created_at < ?",
                [cutoffStr]
            );
            var count = row ? row.cnt : 0;

            if (count > 0) {
                const db = getDB();
                if (db) {
                    db.run("DELETE FROM audit_log WHERE created_at < ?", [cutoffStr]);
                    saveDB();
                    console.log(`[审计] 已清理 ${count} 条过期日志`);
                }
            }
        } catch (err) {
            console.error('[审计] 清理失败:', err);
        }
    };

    // 启动时清理一次
    doCleanup();
    // 之后每天清理一次
    setInterval(doCleanup, 86400000);
}

module.exports = {
    startAutoBackup,
    startAuditCleanup
};
