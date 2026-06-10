// src/middleware/validate.js
// 从 server.js 提取：输入验证中间件

// 通用字段验证中间件（原 server.js 中的 validateRequired）
function validateRequired(fields) {
    return function (req, res, next) {
        for (const field of fields) {
            if (!req.body[field]) {
                return res.status(400).json({ success: false, error: '缺少必要参数: ' + field });
            }
        }
        next();
    };
}

// 日期格式验证
function validateDate(field) {
    return function (req, res, next) {
        var value = req.body[field] || req.query[field];
        if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return res.status(400).json({ success: false, error: '日期格式不正确' });
        }
        next();
    };
}

module.exports = {
    validateRequired,
    validateDate
};
