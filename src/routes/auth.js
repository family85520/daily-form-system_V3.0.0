// src/routes/auth.js
// 认证相关路由：登录验证、检查token、注销、修改密码、重置数据

const { writeAuditLog } = require('../db/database');
const express = require('express');
const router = express.Router();
const { createSession, validateSession, deleteSession } = require('../services/session');
const { verifyPassword, hashPassword, getAdminPwd, checkPasswordStrength } = require('../services/password');
const { rateLimit, writeRateLimit } = require('../middleware/security');
const { queryOne, getDB, saveDB } = require('../db/database');
const { zodValidate, passwordChangeSchema } = require('../middleware/zodValidate');
const audit = require('../constants/auditActions');
const { requireAuth } = require('../middleware/auth');

// --- 密码验证路由（登录） ---
router.post('/verify', async (req, res) => {
    try {
        const ip = req.ip || req.connection.remoteAddress;

        if (!rateLimit(ip, 10, 60000)) {
            return res.status(429).json({ success: false, error: '尝试次数过多，请稍后再试' });
        }

        const { password } = req.body;
        if (!password) {
            return res.json({ success: false, error: '请输入密码' });
        }

        const storedPwd = getAdminPwd();
        const ok = await verifyPassword(password, storedPwd);

        if (ok) {
            const token = createSession(ip);
            console.log('[验证] 通过 IP:', ip);
            writeAuditLog(audit.LOGIN, 'auth', '用户登录成功', '', ip);
            res.json({ success: true, token: token });
        } else {
            console.log('[验证] 拒绝 IP:', ip);
            writeAuditLog(audit.LOGIN_FAIL, 'auth', '登录失败: IP=' + ip, '', ip);
            res.json({ success: false });
        }
    } catch (err) {
        console.error('[验证] 异常:', err);
        res.status(500).json({ success: false, error: '验证异常' });
    }
});

// --- 检查 token 是否有效 ---
router.get('/auth/check', function (req, res) {
    var token = req.headers['x-auth-token'];
    var session = validateSession(token);

    if (session) {
        return res.json({ success: true });
    }
    res.json({ success: false });
});

// --- 注销登录 ---
router.post('/logout', function (req, res) {
    var token = req.headers['x-auth-token'];
    deleteSession(token);
    writeAuditLog(audit.LOGOUT, 'auth', '用户登出', req.user || '', req.ip);
    res.json({ success: true });
});

// --- 修改密码（需认证） ---
router.post('/password', requireAuth, writeRateLimit(10, 60000), zodValidate(passwordChangeSchema), async (req, res) => {
    try {
        const { oldPwd, newPwd } = req.body;

        const strength = checkPasswordStrength(newPwd);
        if (!strength.valid) {
            return res.json({ success: false, error: '密码强度不足: ' + strength.reasons.join('；') });
        }

        const storedPwd = getAdminPwd();
        const ok = await verifyPassword(oldPwd, storedPwd);
        if (!ok) {
            return res.json({ success: false, error: '原密码错误' });
        }

        const db = getDB();
        const newHash = await hashPassword(newPwd);
        db.run("UPDATE system SET value = ? WHERE key = 'adminPwd'", [newHash]);
        db.run("INSERT OR IGNORE INTO system (key, value) VALUES ('pwdIsHashed', '2')");
        saveDB();
        writeAuditLog(audit.PASSWORD_CHANGE, 'auth', '密码修改成功', req.user || '', req.ip);
        res.json({ success: true });
    } catch (err) {
        console.error('修改密码失败:', err);
        res.status(500).json({ success: false, error: '修改密码失败' });
    }
});

// --- 重置数据（需认证） ---
router.post('/reset', requireAuth, writeRateLimit(3, 300000), async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ success: false, error: '请输入管理员密码' });
        }

        const storedPwd = getAdminPwd();
        const ok = await verifyPassword(password, storedPwd);
        if (!ok) {
            writeAuditLog(audit.RESET_FAIL, 'auth', '重置数据失败: 密码错误 IP=' + (req.ip || ''), '', req.ip);
            return res.status(403).json({ success: false, error: '密码错误' });
        }

        const db = getDB();
        db.run("DELETE FROM templates");
        db.run("DELETE FROM submissions");
        db.run("DELETE FROM members");

        const defaultHash = await hashPassword('1234');
        db.run("UPDATE system SET value = ? WHERE key = 'adminPwd'", [defaultHash]);
        db.run("INSERT OR REPLACE INTO system (key, value) VALUES ('pwdIsHashed', '2')");

        saveDB();
        writeAuditLog(audit.RESET_DATA, 'auth', '重置所有数据: 模板、提交、成员已清空，密码已重置为默认 IP=' + (req.ip || ''), '', req.ip);
        res.json({ success: true });
    } catch (err) {
        console.error('重置数据失败:', err);
        res.status(500).json({ success: false, error: '重置数据失败' });
    }
});

module.exports = router;
