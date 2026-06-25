// src/services/password.js
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { getDB, saveDB, queryOne } = require('../db/database');
const config = require('../config');

function hashPasswordSync(pwd) {
    return crypto.createHash('sha256').update(String(pwd)).digest('hex');
}

async function hashPassword(pwd) {
    return await bcrypt.hash(String(pwd), config.SALT_ROUNDS);
}

/**
 * 内部：将密码哈希写入数据库（bcrypt 格式）
 * @private
 */
function _setPasswordHash(newHash) {
    const db = getDB();
    if (!db) return;
    db.run("UPDATE system SET value = ? WHERE key = 'adminPwd'", [newHash]);
    db.run("INSERT OR REPLACE INTO system (key, value) VALUES ('pwdIsHashed', '2')");
    saveDB();
}

/**
 * 内部：SHA256 → bcrypt 升级（线程安全：先验证再升级）
 * @private
 */
async function _applyBcryptUpgrade(inputPassword) {
    const newHash = await bcrypt.hash(String(inputPassword), config.SALT_ROUNDS);
    _setPasswordHash(newHash);
    console.log('[安全] 密码已升级为 bcrypt');
}

/**
 * 检查密码是否为弱哈希（SHA256）
 */
function isWeakHash(stored) {
    return stored && /^[a-f0-9]{64}$/i.test(stored);
}

async function verifyPassword(input, stored) {
    if (isWeakHash(stored)) {
        var sha256Hash = crypto.createHash('sha256').update(String(input)).digest('hex');
        if (sha256Hash === stored) {
            try {
                await _applyBcryptUpgrade(input);
            } catch (e) {
                console.error('[安全] 密码升级失败:', e.message);
            }
            return true;
        }
        return false;
    }
    return await bcrypt.compare(String(input), stored);
}

function getAdminPwd() {
    var row = queryOne("SELECT value FROM system WHERE key = 'adminPwd'");
    return row ? row.value : hashPasswordSync(config.DEFAULT_PASSWORD);
}

/**
 * 强制升级密码为 bcrypt 哈希（已知旧密码）
 */
async function upgradePassword(plainPassword) {
    if (!plainPassword) throw new Error('密码不能为空');
    const db = getDB();
    if (!db) throw new Error('数据库未就绪');

    const stored = getAdminPwd();
    if (!isWeakHash(stored)) {
        return stored;
    }

    const verified = await verifyPassword(plainPassword, stored);
    if (!verified) {
        throw new Error('原密码错误');
    }

    // verifyPassword 内部已通过 _applyBcryptUpgrade 完成升级
    return stored;
}

/**
 * 强制重置密码（已知旧密码）
 */
async function resetPassword(oldPassword, newPassword) {
    if (!oldPassword || !newPassword) throw new Error('参数不完整');
    if (newPassword.length < config.MIN_PASSWORD_LENGTH) {
        throw new Error('新密码长度不能少于 ' + config.MIN_PASSWORD_LENGTH + ' 位');
    }
    if (newPassword.length > 50) throw new Error('新密码长度不能超过 50 位');

    const db = getDB();
    if (!db) throw new Error('数据库未就绪');

    const stored = getAdminPwd();
    const verified = await verifyPassword(oldPassword, stored);
    if (!verified) {
        throw new Error('原密码错误');
    }

    const newHash = await bcrypt.hash(newPassword, config.SALT_ROUNDS);
    _setPasswordHash(newHash);
    console.log('[安全] 密码已修改并升级为 bcrypt');
    return true;
}

/**
 * 检查密码强度
 */
function checkPasswordStrength(pwd) {
    const reasons = [];
    if (!pwd || pwd.length < config.MIN_PASSWORD_LENGTH) reasons.push('密码长度至少 ' + config.MIN_PASSWORD_LENGTH + ' 位');
    if (!/\d/.test(pwd)) reasons.push('密码需包含数字');
    if (!/[a-zA-Z]/.test(pwd)) reasons.push('密码需包含字母');
    if (pwd && /^\d+$/.test(pwd)) reasons.push('密码不能全是数字');
    return { valid: reasons.length === 0, reasons };
}

module.exports = {
    hashPassword: hashPassword,
    hashPasswordSync: hashPasswordSync,
    verifyPassword: verifyPassword,
    getAdminPwd: getAdminPwd,
    isWeakHash: isWeakHash,
    upgradePassword: upgradePassword,
    resetPassword: resetPassword,
    checkPasswordStrength: checkPasswordStrength,
};
