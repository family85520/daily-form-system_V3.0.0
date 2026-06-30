# API 文档

> 每日数据填报系统 V3.0.0 — 后端 RESTful API 接口说明

**基础 URL**: `http://localhost:3000`（可通过 `PORT` 环境变量配置）  
**数据格式**: JSON  
**认证方式**: Token 通过 HTTP Header `X-Auth-Token` 传递  
**请求体上限**: 10MB

---

## 目录

- [全局中间件与安全](#全局中间件与安全)
- [速率限制](#速率限制)
- [认证模块](#认证模块)
- [数据模块](#数据模块)
- [模板模块](#模板模块)
- [提交模块](#提交模块)
- [成员模块](#成员模块)
- [导出模块](#导出模块)
- [审计日志模块](#审计日志模块)
- [管理模块](#管理模块)
- [系统模块](#系统模块)
- [错误响应](#错误响应)
- [审计日志分类](#审计日志分类)

---

## 全局中间件与安全

| 中间件 | 作用 |
|--------|------|
| `cors()` | 启用跨域资源共享 |
| `express.json({ limit: '10mb' })` | 解析 JSON 请求体 |
| `securityHeaders` | 安全响应头（`X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、`X-XSS-Protection`、`Referrer-Policy`） |
| `static` | 动态前端文件服务（支持 v1/v2 双版本热切换） |
| `errorHandler` | 统一错误处理（开发环境暴露详情，生产环境返回通用错误） |

---

## 速率限制

| 端点类别 | 频率上限 | 窗口时长 | 超限响应 |
|-----------|---------|---------|---------|
| 登录验证 (`/api/verify`) | 10 次 | 60 秒 | 429 |
| 批量数据保存 (`/api/data`) | 30 次 | 60 秒 | 429 |
| 创建模板 | 20 次 | 60 秒 | 429 |
| 更新模板 | 30 次 | 60 秒 | 429 |
| 删除模板 | 10 次 | 60 秒 | 429 |
| 提交填报 | 60 次 | 60 秒 | 429 |
| 删除填报 | 60 次 | 60 秒 | 429 |
| 保存成员 | 30 次 | 60 秒 | 429 |
| 修改密码 | 10 次 | 60 秒 | 429 |
| 重置数据 | 3 次 | 300 秒 | 429 |

---

## 认证模块

### POST `/api/verify` — 管理员登录

验证管理员密码，成功后返回 Token。

**请求体**:
```json
{
  "password": "123456"
}
```

**响应**:
```json
{
  "success": true,
  "token": "a1b2c3d4e5f6..."
}
```

**失败响应**:
```json
{
  "success": false,
  "message": "密码错误"
}
```

---

### GET `/api/auth/check` — 检查 Token 有效性

验证当前 Token 是否有效。

**请求头**: `X-Auth-Token: <token>`

**响应**:
```json
{
  "success": true
}
// 或
{
  "success": false
}
```

---

### POST `/api/logout` — 注销登录

使当前 Token 失效。

**请求头**: `X-Auth-Token: <token>`

**响应**:
```json
{
  "success": true,
  "message": "已注销"
}
```

---

### POST `/api/password` — 修改密码

修改管理员密码。新密码最少 6 位。

**请求体**:
```json
{
  "oldPwd": "123456",
  "newPwd": "newpassword"
}
```

**响应**:
```json
{
  "success": true,
  "message": "密码修改成功"
}
```

---

### POST `/api/reset` — 重置所有数据

清空所有模板、提交数据和成员，密码恢复为默认值。需要二次验证。

**请求体**:
```json
{
  "password": "123456"
}
```

**响应**:
```json
{
  "success": true,
  "message": "数据已重置"
}
```

---

## 数据模块

### GET `/api/data` — 获取全部数据

获取所有模板、成员和提交数据。支持增量更新。

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `since` | number | 时间戳（毫秒），仅返回此时间之后的变更 |

**响应**:
```json
{
  "success": true,
  "data": {
    "tpls": [...],
    "members": {...},
    "sub": {...}
  }
}
```

---

### POST `/api/data` — 批量保存数据

一次性保存模板、成员和提交数据（事务写入，全成功或全回滚）。

**请求体**:
```json
{
  "tpls": [...],
  "members": {...},
  "sub": {...}
}
```

**响应**:
```json
{
  "success": true,
  "message": "数据保存成功"
}
```

---

## 模板模块

### POST `/api/template` — 创建/更新模板

创建新模板或更新现有模板。

**请求体**:
```json
{
  "id": "tpl_001",
  "name": "销售日报",
  "columns": [
    { "id": "col1", "header": "产品名称", "type": "text", "required": true }
  ],
  "rows": ["产品A", "产品B", "产品C"],
  "filterField": "",
  "titleFields": [],
  "rules": []
}
```

**响应**:
```json
{
  "success": true,
  "message": "模板创建成功"
}
```

---

### PUT `/api/template/:id` — 更新模板

更新指定 ID 的模板。支持字段重命名（自动同步提交数据）。

**请求体**:
```json
{
  "name": "销售日报",
  "columns": [...],
  "rows": [...],
  "filterField": "",
  "titleFields": [],
  "rules": [],
  "fieldRenames": {
    "旧字段名": "新字段名"
  }
}
```

---

### DELETE `/api/template/:id` — 删除模板

删除指定模板及其关联的所有成员和提交数据。

**响应**:
```json
{
  "success": true,
  "message": "模板删除成功"
}
```

---

### POST `/api/import/json` — JSON 导入模板

从 JSON 文件导入模板数据。

**请求体**:
```json
{
  "id": "tpl_002",
  "name": "导入的模板",
  "columns": [...],
  "rows": [...]
}
```

---

### POST `/api/template/export-log` — 记录导出审计日志

前端导出模板时调用，记录审计日志（失败不影响导出流程）。

**请求体**:
```json
{
  "tplId": "tpl_001",
  "action": "export"
}
```

---

## 提交模块

### POST `/api/submission` — 保存填报数据

保存单条或多条填报数据。

**请求体**:
```json
{
  "tplId": "tpl_001",
  "date": "2026-06-30",
  "user": "张三",
  "submissions": [
    {
      "rowIndex": 0,
      "fieldValues": {
        "产品名称": "产品A",
        "销售额": "1000"
      }
    }
  ]
}
```

**日期格式**: `YYYY-MM-DD`

**响应**:
```json
{
  "success": true,
  "message": "填报数据保存成功"
}
```

---

### DELETE `/api/submission` — 删除填报数据

删除指定填报记录。

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `tplId` | string | 是 | 模板 ID |
| `date` | string | 是 | 日期 `YYYY-MM-DD` |
| `user` | string | 是 | 填报人 |
| `rowIndex` | number | 是 | 行号 |

**响应**:
```json
{
  "success": true,
  "message": "填报数据删除成功"
}
```

---

## 成员模块

### POST `/api/members` — 保存模板成员列表

保存模板的成员列表。自动新增不在列表中的成员，删除列表中不存在的成员。

**请求体**:
```json
{
  "tplId": "tpl_001",
  "members": ["张三", "李四", "王五"]
}
```

**响应**:
```json
{
  "success": true,
  "message": "成员列表已更新"
}
```

---

## 导出模块

### GET `/api/export/csv` — 导出 CSV 文件

导出填报数据为 CSV 文件。最多 50000 行，UTF-8 BOM 编码。

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `tplId` | string | 是 | 模板 ID |
| `user` | string | 否 | 按用户筛选 |
| `date` | string | 否 | 按日期筛选 (`YYYY-MM-DD`) |

**响应**: 文件下载（`Content-Disposition: attachment`）

---

### GET `/api/export/excel` — 导出 Excel 文件

导出填报数据为 Excel (.xlsx) 文件。自动列宽适配。

**查询参数**: 同 CSV 导出

**响应**: 文件下载

---

## 审计日志模块

### GET `/api/audit` — 查询审计日志

查询系统操作审计日志。

**查询参数**:
| 参数 | 类型 | 默认值 | 最大值 | 说明 |
|------|------|--------|--------|------|
| `category` | string | - | - | 按分类筛选 |
| `action` | string | - | - | 按操作筛选 |
| `limit` | number | 200 | 2000 | 返回数量上限 |

**响应**:
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "time": "2026-06-30 10:00:00",
      "action": "login",
      "category": "auth",
      "user": "admin",
      "detail": "管理员登录",
      "ip": "127.0.0.1"
    }
  ],
  "categories": ["auth", "template", "data", "member", "system"],
  "actions": ["login", "logout", "template_create", ...]
}
```

---

### DELETE `/api/audit` — 清空审计日志

清空所有审计日志记录。

**响应**:
```json
{
  "success": true,
  "message": "审计日志已清空"
}
```

---

## 管理模块

### GET `/api/admin/frontend-version` — 获取前端版本

获取当前正在使用的前端版本。

**响应**:
```json
{
  "success": true,
  "version": "v2"
}
```

---

### POST `/api/admin/switch-frontend` — 切换前端版本

切换前端版本（v1 或 v2）。无需认证。

**请求体**:
```json
{
  "version": "v2"
}
```

**响应**:
```json
{
  "success": true,
  "message": "已切换到 v2"
}
```

---

## 系统模块

### GET `/health` — 健康检查

检查服务是否正常运行。

**响应**:
```json
{
  "status": "ok",
  "timestamp": "2026-06-30T10:00:00.000Z"
}
```

---

## 错误响应

所有错误响应遵循统一格式：

```json
{
  "success": false,
  "message": "错误描述"
}
```

常见 HTTP 状态码：

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 / Token 无效 |
| 429 | 请求过于频繁（触发速率限制） |
| 500 | 服务器内部错误 |

---

## 审计日志分类

| 分类 (category) | 操作 (action) | 触发场景 |
|----------------|---------------|---------|
| `auth` | `login` | 管理员登录成功 |
| `auth` | `login_fail` | 管理员登录失败 |
| `auth` | `logout` | 管理员注销 |
| `auth` | `password_change` | 修改密码 |
| `auth` | `reset_data` | 重置所有数据成功 |
| `auth` | `reset_fail` | 重置所有数据失败 |
| `template` | `template_create` | 创建模板 |
| `template` | `template_update` | 更新模板 |
| `template` | `template_delete` | 删除模板 |
| `template` | `field_rename` | 字段重命名 |
| `data` | `data_save` | 批量保存数据 |
| `data` | `submission_save` | 提交填报数据 |
| `data` | `submission_delete` | 删除填报数据 |
| `data` | `export_csv` | 导出 CSV |
| `data` | `export_excel` | 导出 Excel |
| `data` | `export` | 导出模板 JSON |
| `member` | `member_save` | 保存成员列表 |
| `system` | `error` | 服务器异常 |
| `system` | `audit_clear` | 清空审计日志 |
