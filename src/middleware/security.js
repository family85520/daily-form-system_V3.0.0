// src/middleware/security.js
// 从 server.js 提取：安全头中间件、速率限制函数、写操作速率限制中间件

const rateLimitMap = new Map();

// 速率限制核心函数（原 server.js 中的 rateLimit）
function rateLimit(ip, maxAttempts, windowMs) {
    maxAttempts = maxAttempts || 10;
    windowMs = windowMs || 60000;
    const now = Date.now();
    const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
    } else {
        record.count++;
    }

    rateLimitMap.set(ip, record);
    return record.count <= maxAttempts;
}

// 写操作速率限制中间件（原 server.js 中的 writeRateLimit）
function writeRateLimit(maxAttempts, windowMs) {
    maxAttempts = maxAttempts || 60;
    windowMs = windowMs || 60000;
    return function (req, res, next) {
        var ip = req.ip || req.connection.remoteAddress;
        if (!rateLimit(ip, maxAttempts, windowMs)) {
            return res.status(429).json({ success: false, error: '操作过于频繁，请稍后再试' });
        }
        next();
    };
}

// 安全响应头中间件（原 server.js 中的 app.use 回调）
function securityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
}

// 速率限制记录清理（原 server.js 中 setInterval 内的 rateLimitMap 清理逻辑）
function cleanupRateLimit() {
    const now = Date.now();

    for (const [ip, record] of rateLimitMap.entries()) {
        if (now > record.resetTime) rateLimitMap.delete(ip);
    }

    const RATE_LIMIT_HARD_CAP = 20000;
    if (rateLimitMap.size > RATE_LIMIT_HARD_CAP) {
        var arr = Array.from(rateLimitMap.entries()).sort(function (a, b) {
            return a[1].resetTime - b[1].resetTime;
        });
        arr.slice(0, rateLimitMap.size - RATE_LIMIT_HARD_CAP).forEach(function (item) {
            rateLimitMap.delete(item[0]);
        });
    }
}

// 启动清理定时器（原 server.js 中合并定时器的一部分）
setInterval(cleanupRateLimit, 60000);

module.exports = {
    rateLimit,
    writeRateLimit,
    securityHeaders
};
