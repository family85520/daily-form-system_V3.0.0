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

async function verifyPassword(input, stored) {
    if (/^[a-f0-9]{64}$/i.test(stored)) {
        var sha256Hash = crypto.createHash('sha256').update(String(input)).digest('hex');
        if (sha256Hash === stored) {
            try {
                var newHash = await bcrypt.hash(String(input), config.SALT_ROUNDS);
                var db = getDB();
                if (db) {
                    db.run("UPDATE system SET value = ? WHERE key = 'adminPwd'", [newHash]);
                    db.run("INSERT OR REPLACE INTO system (key, value) VALUES ('pwdIsHashed', '2')");
                    saveDB();
                    console.log('[安全] 密码已从 SHA256 自动升级为 bcrypt');
                }
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

module.exports = {
    hashPassword: hashPassword,
    hashPasswordSync: hashPasswordSync,
    verifyPassword: verifyPassword,
    getAdminPwd: getAdminPwd
};
