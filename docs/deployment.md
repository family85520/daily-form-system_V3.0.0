# 部署文档

> 每日数据填报系统 V3.0.0 — 生产环境部署指南

---

## 目录

- [环境要求](#环境要求)
- [快速部署](#快速部署)
- [详细部署步骤](#详细部署步骤)
- [环境变量配置](#环境变量配置)
- [双轨前端切换](#双轨前端切换)
- [数据库备份与恢复](#数据库备份与恢复)
- [进程管理](#进程管理)
- [Nginx 反向代理](#nginx-反向代理)
- [故障排查](#故障排查)

---

## 环境要求

| 组件 | 最低版本 | 推荐版本 |
|------|----------|----------|
| Node.js | 16.x | 18.x LTS |
| npm | 8.x | 10.x |

> 注意：本项目使用 sql.js（WASM），无需安装 SQLite 原生依赖。

---

## 快速部署

```bash
# 1. 克隆项目
git clone <repository-url>
cd daily-form-system_V3.0.0

# 2. 安装依赖
npm install

# 3. 构建前端
npm run build

# 4. 启动服务
npm start
```

服务将在 `http://localhost:3000` 启动。

---

## 详细部署步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量（可选）

在项目根目录创建 `.env` 文件：

```env
# 服务器端口（默认 3000）
PORT=3000

# 数据目录（默认 ./data）
DATA_DIR=./data

# 前端版本（v1 或 v2，默认 v2）
FRONTEND_VERSION=v2

# 会话超时时间（毫秒，默认 1800000 = 30 分钟）
SESSION_DURATION=1800000

# 最大会话数（默认 500）
MAX_SESSIONS=500

# 默认管理员密码（首次启动时设置）
DEFAULT_ADMIN_PASSWORD=your_secure_password
```

### 3. 构建前端

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

### 4. 启动服务

```bash
# 生产模式
npm start

# 或手动启动
node server.js
```

### 5. 验证部署

访问 `http://localhost:3000` 应显示填报页面。

访问 `http://localhost:3000/health` 应返回：
```json
{
  "status": "ok",
  "timestamp": "2026-06-30T10:00:00.000Z"
}
```

---

## 环境变量配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务器端口 | `3000` |
| `DATA_DIR` | 数据库文件目录 | `./data` |
| `FRONTEND_VERSION` | 默认前端版本 | `v2` |
| `SESSION_DURATION` | 会话持续时间（毫秒） | `1800000` (30 分钟) |
| `MAX_SESSIONS` | 最大并发会话数 | `500` |
| `DEFAULT_ADMIN_PASSWORD` | 默认管理员密码 | `1234` |

---

## 双轨前端切换

系统支持运行时切换 V1（遗留 HTML）和 V2（Vue 3）前端。

### 方式 1：环境变量

启动时指定：
```bash
FRONTEND_VERSION=v1 node server.js
FRONTEND_VERSION=v2 node server.js
```

### 方式 2：管理 API

```bash
# 切换到 v2
curl -X POST http://localhost:3000/api/admin/switch-frontend \
  -H "Content-Type: application/json" \
  -d '{"version":"v2"}'

# 切换到 v1
curl -X POST http://localhost:3000/api/admin/switch-frontend \
  -H "Content-Type: application/json" \
  -d '{"version":"v1"}'
```

### 方式 3：管理页面

在管理页面 `AdminPage.vue` 中已有版本切换入口。

### 方式 4：浏览器控制台

```javascript
// 切换到 v2
fetch('/api/admin/switch-frontend', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({version: 'v2'})
}).then(r => r.json()).then(console.log)

// 切换到 v1
fetch('/api/admin/switch-frontend', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({version: 'v1'})
}).then(r => r.json()).then(console.log)
```

**切换后刷新页面即可看到新版本。**

---

## 数据库备份与恢复

### 自动备份

| 策略 | 说明 |
|------|------|
| **防抖写盘** | 内存操作 100ms 防抖后写入 `data/app.db` |
| **进程退出** | 监听 `exit/SIGINT/SIGTERM` 强制落盘 |
| **每日备份** | 每天自动备份到 `data/backups/auto/`，保留 7 天 |

### 项目快照

```bash
# 创建快照
npm run snapshot

# 查看所有快照
npm run snapshot:list

# 恢复快照
node scripts/snapshot-all.js restore backup_2026-06-30_10-00-00

# 删除快照
node scripts/snapshot-all.js delete backup_2026-06-30_10-00-00
```

### 手动备份

```bash
# 停止服务
# 复制数据库文件
cp data/app.data/backups/manual/

# 启动服务
```

### 恢复脚本

| 脚本 | 说明 |
|------|------|
| `rollback.bat` | 回滚整个项目到上一个快照 |
| `rollback-db.bat` | 仅回滚数据库到上一个快照 |

---

## 进程管理

### PM2 部署（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动
pm2 start server.js --name "daily-form"

# 查看状态
pm2 status

# 查看日志
pm2 logs daily-form

# 重启
pm2 restart daily-form

# 停止
pm2 stop daily-form

# 开机自启
pm2 startup
pm2 save
```

### systemd 部署（Linux）

创建 `/etc/systemd/system/daily-form.service`：

```ini
[Unit]
Description=Daily Data Reporting System
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/daily-form-system
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=FRONTEND_VERSION=v2

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable daily-form
sudo systemctl start daily-form
sudo systemctl status daily-form
```

---

## Nginx 反向代理

### 基础配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 静态资源缓存（生产环境可开启）
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 静态文件缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
}
```

### HTTPS 配置（推荐）

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://localhost:3000;
        # ... 其他代理配置同上
    }
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 故障排查

### 服务无法启动

```bash
# 检查端口占用
netstat -ano | findstr :3000

# 检查数据库文件权限
ls -la data/

# 查看详细错误日志
node server.js 2>&1 | tee error.log
```

### 数据库损坏

```bash
# 停止服务
# 从自动备份恢复
cp data/backups/auto/backup_latest.db data/app.db
# 启动服务
```

### 前端页面空白

```bash
# 重新构建
npm run build

# 检查构建产物
ls dist/

# 确认 FRONTEND_VERSION 环境变量
echo $FRONTEND_VERSION
```

### 连接状态异常

- 检查后端服务是否正常运行
- 检查浏览器控制台是否有 CORS 错误
- 确认 Vite 代理配置正确（开发环境）

### 会话频繁过期

- 增加 `SESSION_DURATION` 环境变量值
- 检查服务器时钟是否同步（NTP）
