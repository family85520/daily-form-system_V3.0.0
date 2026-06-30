# 数据库文档

> 每日数据填报系统 V3.0.0 — SQLite 数据库结构说明

**数据库引擎**: SQLite (通过 sql.js WASM 运行于 Node.js)  
**物理文件**: `data/app.db`  
**持久化方式**: 内存操作 + 100ms 防抖写盘 + 进程退出强制落盘

---

## 目录

- [表结构总览](#表结构总览)
- [表详细说明](#表详细说明)
- [索引](#索引)
- [迁移与兼容性](#迁移与兼容性)
- [数据库辅助机制](#数据库辅助机制)
- [会话管理策略](#会话管理策略)
- [自动备份与清理](#自动备份与清理)
- [核心文件清单](#核心文件清单)

---

## 表结构总览

| 表名 | 说明 | 主要字段 |
|------|------|---------|
| `templates` | 表单模板定义 | id, name, columns(JSON), rows, filterField, titleFields, rules(JSON) |
| `members` | 填报成员列表 | template_id, name |
| `submissions` | 提交数据 | template_id, date, user_name, row_index, data(JSON) |
| `audit_log` | 审计日志 | time, action, category, user, detail, ip |
| `sessions` | 会话令牌 | token, ip, expires_at |
| `system` | 系统配置 | key, value |

---

## 表详细说明

### 1. templates（表单模板）

存储表单模板的结构定义，包括字段、行、筛选规则和校验规则。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | TEXT | PRIMARY KEY | - | 模板唯一标识（如 `tpl_001`） |
| `name` | TEXT | NOT NULL | - | 模板名称 |
| `columns` | TEXT | - | `'[]'` | JSON 数组，字段定义（列配置） |
| `rows` | TEXT | - | `'[]'` | JSON 数组，基础行定义 |
| `filter_field` | TEXT | - | `''` | 筛选字段名（决定哪些用户填哪些行） |
| `title_fields` | TEXT | - | `'[]'` | JSON 数组，标题字段列表 |
| `rules` | TEXT | - | `'[]'` | JSON 数组，字段规则校验配置 |
| `created_at` | TEXT | - | `datetime('now','localtime')` | 创建时间 |
| `updated_at` | TEXT | - | `datetime('now','localtime')` | 最后更新时间 |

**columns JSON 结构示例**:
```json
[
  {
    "id": "col1",
    "header": "产品名称",
    "type": "text",
    "required": true,
    "isEditable": true,
    "included": true,
    "constraints": { "minLength": 1, "maxLength": 100 }
  }
]
```

---

### 2. members（填报成员）

存储每个模板下的填报成员列表。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | - | 自增主键 |
| `template_id` | TEXT | NOT NULL | `'0'` | 关联的模板 ID |
| `name` | TEXT | NOT NULL | - | 成员姓名 |
| `created_at` | TEXT | - | `datetime('now','localtime')` | 加入时间 |

---

### 3. submissions（提交数据）

存储所有填报提交的数据，以 JSON 格式存储每条记录的字段值。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | - | 自增主键 |
| `template_id` | TEXT | NOT NULL | `'0'` | 关联模板 ID |
| `date` | TEXT | NOT NULL | - | 提交日期 (`YYYY-MM-DD`) |
| `user_name` | TEXT | NOT NULL | - | 填报人姓名 |
| `row_index` | INTEGER | NOT NULL | - | 行号（对应模板的行结构索引） |
| `data` | TEXT | NOT NULL | `'{}'` | JSON 对象，字段名 → 字段值的映射 |
| `updated_at` | TEXT | - | `datetime('now','localtime')` | 更新时间 |

**data JSON 结构示例**:
```json
{
  "产品名称": "产品A",
  "销售额": "1000",
  "备注": "正常销售"
}
```

---

### 4. audit_log（审计日志）

记录系统中所有重要操作的审计日志，支持操作追溯。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | - | 自增主键 |
| `time` | TEXT | NOT NULL | - | 格式化时间 (`YYYY-MM-DD HH:mm:ss`) |
| `action` | TEXT | NOT NULL | - | 动作标识（见下方常量列表） |
| `category` | TEXT | - | `'system'` | 分类 (`auth`/`template`/`data`/`member`/`system`) |
| `user` | TEXT | - | `''` | 操作用户名 |
| `detail` | TEXT | - | `''` | 详细描述文本 |
| `ip` | TEXT | - | `''` | 操作者 IP 地址 |
| `created_at` | TEXT | - | `datetime('now','localtime')` | 记录插入时间 |

**action 常量分类**:

| 分类 | 动作 |
|------|------|
| 认证 | `login` / `login_fail` / `logout` / `password_change` |
| 模板 | `template_create` / `template_update` / `template_delete` / `field_rename` / `导入模板` |
| 数据 | `data_save` / `submission_save` / `submission_delete` / `export_csv` / `export_excel` |
| 成员 | `member_save` |
| 系统 | `重置` / `重置失败` / `audit_clear` / `error` |

---

### 5. sessions（会话管理）

存储管理员登录会话令牌，支持滑动窗口续期和硬上限控制。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `token` | TEXT | PRIMARY KEY | - | 64 位十六进制随机令牌 |
| `ip` | TEXT | - | `''` | 登录 IP 地址 |
| `created_at` | INTEGER | NOT NULL | - | 创建时间戳（毫秒） |
| `expires_at` | INTEGER | NOT NULL | - | 过期时间戳（毫秒），滑动窗口续期 |

---

### 6. system（系统配置）

Key-Value 形式的系统配置表。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `key` | TEXT | PRIMARY KEY | 配置键名 |
| `value` | TEXT | NOT NULL | 配置值 |

**已知配置项**:

| Key | 说明 | 示例值 |
|-----|------|--------|
| `adminPwd` | 管理员密码哈希（bcrypt） | `$2b$10$...` |
| `pwdIsHashed` | 标记密码是否已哈希 | `"2"` |

---

## 索引

| 表 | 索引名 | 字段 | 说明 |
|----|--------|------|------|
| `members` | `idx_member_name` | `(template_id, name)` | 同一模板下成员名唯一 |
| `submissions` | `idx_sub_unique` | `(template_id, date, user_name, row_index)` | 防止重复提交 |
| `audit_log` | `idx_audit_action` | `(action)` | 加速按动作查询 |
| `audit_log` | `idx_audit_category` | `(category)` | 加速按分类查询 |
| `audit_log` | `idx_audit_time` | `(time)` | 加速按时间排序 |
| `sessions` | `idx_sessions_expires` | `(expires_at)` | 加速过期会话清理 |

---

## 迁移与兼容性

### 启动时自动迁移 (`src/db/migrations.js`)

系统在每次启动时自动执行以下迁移：

1. **templates.id 类型升级**: 检测 `templates.id` 是否为 INTEGER 旧类型，若是则 DROP 重建表并迁移数据为 TEXT 类型
2. **rules 字段添加**: 检测 `templates` 表是否缺少 `rules` 列，若缺失则 `ALTER TABLE ADD COLUMN`
3. **默认管理员密码**: 初始化默认管理员密码（bcrypt 哈希，默认密码 `1234`）

### 审计日志表兼容性 (`src/db/database.js`)

`initDB()` 中检测旧版 `audit_log` 表是否有 `time` 列，若无则 DROP 重建。逐步检查 `category`/`user`/`ip`/`created_at` 列是否缺失，逐一 `ADD COLUMN`。

---

## 数据库辅助机制

| 机制 | 文件 | 说明 |
|------|------|------|
| **防抖写盘** | `database.js::saveDB()` | 修改后 100ms 内只写一次，减少磁盘 I/O |
| **强制写盘** | `database.js::saveDBNow()` | 跳过防抖，立即落盘 |
| **进程退出钩子** | `database.js` | 监听 `exit/SIGINT/SIGTERM/SIGUSR2/uncaughtException`，强制落盘后退出 |
| **自动备份** | `backup.js::startAutoBackup()` | 每天一次 `.db` 副本，保留最近 7 天 |
| **事务封装** | `database.js::withTransaction()` | `BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK` |
| **查询封装** | `database.js` | `runSQL()`/`execSQL()` Promise 包装，`queryOne()`/`queryAll()` |

---

## 会话管理策略

| 策略 | 说明 |
|------|------|
| **有效期** | 30 分钟滑动窗口，每次验证自动续期 |
| **内存上限** | 500 个并发 session，超出时 LRU 淘汰最早过期的 |
| **内存缓存** | 启动时从数据库加载活跃 session 到 Map，验证时优先读内存 |
| **自动清理** | 每分钟扫描一次，删除过期记录 |
| **令牌生成** | 64 位十六进制随机字符串 |

---

## 自动备份与清理

### 数据库自动备份

| 策略 | 说明 |
|------|------|
| **频率** | 每天一次 |
| **位置** | `data/backups/auto/` |
| **保留** | 最近 7 天 |

### 审计日志自动清理

| 策略 | 说明 |
|------|------|
| **频率** | 每小时检查一次 |
| **规则** | 删除超过 90 天的日志记录 |

### 项目快照

| 策略 | 说明 |
|------|------|
| **命令** | `npm run snapshot` |
| **位置** | `data/backups/project-snapshots/` |
| **保留** | 最多 10 个 |
| **排除** | `node_modules/`、`dist/`、`data/` 目录 |

---

## 核心文件清单

| 文件 | 职责 |
|------|------|
| `src/db/database.js` | 数据库初始化、查询封装、审计日志写入、会话建表 |
| `src/db/migrations.js` | 表结构创建、数据迁移、索引构建 |
| `src/db/queryHelpers.js` | 行对象转换辅助函数、按模板聚合查询提交数据 |
| `src/db/backup.js` | 自动备份与审计日志清理 |
| `src/services/session.js` | 会话生命周期管理（创建/验证/删除） |
| `src/config/index.js` | 配置常量（会话超时、速率限制、保留天数等） |
| `src/constants/auditActions.js` | 审计日志 Action 常量枚举 |
