// src/middleware/zodValidate.js
// 基于 Zod 的结构化输入验证中间件

const zod = require('zod');

/**
 * 创建 Zod schema 验证中间件
 * @param {zod.ZodSchema} schema - Zod schema 实例
 * @returns {Function} Express 中间件
 */
function zodValidate(schema) {
    return (req, res, next) => {
        try {
            const source = req.body;
            if (!source) return next();
            schema.parse(source);
            next();
        } catch (err) {
            if (err instanceof zod.ZodError) {
                const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
                return res.status(400).json({ success: false, error: '参数验证失败: ' + messages });
            }
            console.error('Zod 验证异常:', err);
            return res.status(500).json({ success: false, error: '验证服务异常' });
        }
    };
}

/**
 * 模板 schema — 验证模板创建/更新/导入数据
 */
const templateSchema = zod.object({
    id: zod.string().min(1).max(64).optional(),
    name: zod.string().min(1).max(128),
    columns: zod.array(zod.object({
        id: zod.string().optional(),
        header: zod.string().min(1).max(64),
        type: zod.enum(['text', 'textarea', 'number', 'date', 'select', 'sequence']),
        required: zod.boolean().default(false),
        isEditable: zod.boolean().default(true),
        included: zod.boolean().default(true),
        uniqueValues: zod.array(zod.string()).default([]),
        constraints: zod.object({
            min: zod.number().optional(),
            max: zod.number().optional(),
            minLength: zod.number().optional(),
            maxLength: zod.number().optional(),
            options: zod.array(zod.string()).optional(),
        }).optional(),
    })).min(1),
    rows: zod.array(zod.record(zod.string(), zod.string())).default([]),
    filterField: zod.string().optional().default(''),
    titleFields: zod.array(zod.string()).default([]),
    rules: zod.array(zod.object({
        id: zod.string().optional(),
        field: zod.string(),
        condition: zod.object({
            field: zod.string(),
            operator: zod.string(),
            value: zod.string(),
        }),
        action: zod.object({
            type: zod.string(),
            field: zod.string().optional(),
        }),
        disabled: zod.boolean().default(false),
    })).default([]),
    source: zod.enum(['json_import', 'excel_import']).optional(),
});

/**
 * 提交数据 schema — 验证批量提交
 */
const submissionSchema = zod.object({
    tplId: zod.string().min(1).max(64),
    date: zod.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    user: zod.string().min(1).max(64),
    submissions: zod.record(zod.string(), zod.record(zod.string(), zod.string())),
});

/**
 * 导出请求 schema — 验证 CSV/Excel 导出参数
 */
const exportQuerySchema = zod.object({
    tplId: zod.string().min(1).max(64),
    user: zod.string().optional(),
    date: zod.string().optional(),
});

/**
 * 删除提交 schema — 验证删除参数
 */
const deleteSubmissionSchema = zod.object({
    tplId: zod.string().min(1).max(64),
    date: zod.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    user: zod.string().min(1).max(64),
    rowIndex: zod.preprocess(val => Number(val), zod.number().int().min(0)),
});

/**
 * 模板删除 schema
 */
const deleteTemplateSchema = zod.object({
    id: zod.string().min(1).max(64),
});

/**
 * 成员保存 schema
 */
const memberSchema = zod.object({
    tplId: zod.string().min(1).max(64),
    members: zod.array(zod.string().min(1).max(64)).min(1),
});

/**
 * 前端批量保存 schema（宽松版：允许 tpls/members/sub 可选）
 */
const bulkSaveSchema = zod.object({
    tpls: zod.array(templateSchema).optional(),
    members: zod.record(zod.array(zod.string())).optional(),
    sub: zod.record(
        zod.record(zod.record(zod.record(zod.string())))
    ).optional(),
}).strict();

module.exports = {
    zodValidate,
    templateSchema,
    submissionSchema,
    exportQuerySchema,
    deleteSubmissionSchema,
    deleteTemplateSchema,
    memberSchema,
    bulkSaveSchema,
};
