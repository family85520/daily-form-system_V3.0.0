// src/routes/export.js
// 导出路由：CSV导出、Excel导出

const { writeAuditLog } = require('../db/database');
const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const { queryOne, queryAll } = require('../db/database');
const { zodValidate, exportQuerySchema } = require('../middleware/zodValidate');
const { rowToTemplate, rowToSubmission, getSubmissionsByTemplate } = require('../db/queryHelpers');

// --- 导出 CSV（无需认证） ---
router.get('/export/csv', zodValidate(exportQuerySchema), (req, res) => {
    try {
        const tplId = String(req.query.tplId);
        const tpl = getTemplateById(tplId);
        if (!tpl) return res.status(400).send('暂无模板');

        const filterUser = req.query.user || '';
        const filterDate = req.query.date || '';

        const tplSub = getSubmissionsByTemplate(tplId);
        const allCols = tpl.columns.filter(c => c.included);

        let csv = '\uFEFF日期,填报人';
        allCols.forEach(c => {
            csv += ',"' + (c.header || '').replace(/"/g, '""') + '"';
        });
        csv += '\n';

        let rowCount = 0;
        const MAX_ROWS = 50000;

        const datesToExport = filterDate ? [filterDate] : Object.keys(tplSub).sort().reverse();

        for (const date of datesToExport) {
            if (rowCount >= MAX_ROWS) break;
            const subs = tplSub[date];
            if (!subs) continue;
            const users = filterUser ? Object.keys(subs).filter(u => u === filterUser) : Object.keys(subs);
            for (const user of users) {
                if (rowCount >= MAX_ROWS) break;
                const ud = subs[user];
                if (!ud || typeof ud !== 'object') continue;
                for (const ri of Object.keys(ud)) {
                    if (rowCount >= MAX_ROWS) break;
                    const rd = ud[ri];
                    if (!rd || typeof rd !== 'object') continue;
                    if (!Object.values(rd).some(v => v && String(v).trim())) continue;
                    const row = (tpl.rows && tpl.rows[parseInt(ri)]) ? tpl.rows[parseInt(ri)] : {};
                    csv += date + ',' + user;
                    allCols.forEach(c => {
                        let val = c.isEditable ? (rd[c.header] || '') : (row[c.header] || '');
                        csv += ',"' + String(val || '').replace(/"/g, '""') + '"';
                    });
                    csv += '\n';
                    rowCount++;
                }
            }
        }

        const userLabel = filterUser || '全部';
        const dateLabel = filterDate || '全部数据';
        const fileName = userLabel + '_' + dateLabel + '.csv';

        res.setHeader('Content-Type', 'text/csv;charset=utf-8');
        writeAuditLog('export_csv', 'data', '导出CSV: 模板「' + (tpl.name || tplId) + '」「日期=' + (filterDate || '全部') + ' 用户=' + (filterUser || '全部') + '」成功', req.user || '', req.ip);
        setDownloadHeader(res, fileName);
        res.send(csv);
    } catch (err) {
        console.error('CSV导出异常:', err);
        res.status(500).send('导出失败');
    }
});

// --- 导出 Excel（无需认证） ---
router.get('/export/excel', zodValidate(exportQuerySchema), (req, res) => {
    try {
        const tplId = String(req.query.tplId);
        const tpl = getTemplateById(tplId);
        if (!tpl) return res.status(400).json({ error: '暂无模板' });

        const filterUser = req.query.user || '';
        const filterDate = req.query.date || '';

        const tplSub = getSubmissionsByTemplate(tplId);
        const allCols = tpl.columns.filter(c => c.included);
        const headers = allCols.map(c => c.header || '');

        const dataRows = [];
        const MAX_ROWS = 50000;

        const datesToExport = filterDate ? [filterDate] : Object.keys(tplSub).sort().reverse();

        for (const date of datesToExport) {
            if (dataRows.length >= MAX_ROWS) break;
            const subs = tplSub[date];
            if (!subs) continue;
            const users = filterUser ? Object.keys(subs).filter(u => u === filterUser) : Object.keys(subs);
            for (const user of users) {
                if (dataRows.length >= MAX_ROWS) break;
                const ud = subs[user];
                if (!ud || typeof ud !== 'object') continue;
                for (const ri of Object.keys(ud)) {
                    if (dataRows.length >= MAX_ROWS) break;
                    const rd = ud[ri];
                    if (!rd || typeof rd !== 'object') continue;
                    if (!Object.values(rd).some(v => v && String(v).trim())) continue;
                    const row = (tpl.rows && tpl.rows[parseInt(ri)]) ? tpl.rows[parseInt(ri)] : {};
                    const r = { __date: date, __user: user };
                    allCols.forEach(c => {
                        r[c.header] = c.isEditable ? (rd[c.header] || '') : (row[c.header] || '');
                    });
                    dataRows.push(r);
                }
            }
        }

        const exportHeaders = ['日期', '填报人'].concat(headers);
        const aoa = [exportHeaders];
        dataRows.forEach(r => {
            const rowData = [r.__date, r.__user];
            headers.forEach(h => { rowData.push(r[h] || ''); });
            aoa.push(rowData);
        });

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = exportHeaders.map(h => {
            let mx = h.length * 2;
            dataRows.forEach(r => {
                const v = String(r[h] || '');
                if (v.length * 1.5 > mx) mx = v.length * 1.5;
            });
            return { wch: Math.min(Math.max(mx, 8), 30) };
        });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '数据');
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

        const userLabel = filterUser || '全部';
        const dateLabel = filterDate || '全部数据';
        const fileName = userLabel + '_' + tpl.name + '_' + dateLabel + '.xlsx';

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        writeAuditLog('export_excel', 'data', '导出Excel: 模板「' + (tpl.name || tplId) + '」「日期=' + (filterDate || '全部') + ' 用户=' + (filterUser || '全部') + '」成功', req.user || '', req.ip);
        setDownloadHeader(res, fileName);
        res.send(Buffer.from(wbout));
    } catch (err) {
        console.error('Excel导出异常:', err);
        res.status(500).json({ error: '导出失败' });
    }
});

// ===== 辅助函数 =====

function getTemplateById(tplId) {
    try {
        return rowToTemplate(
            queryOne("SELECT * FROM templates WHERE id = ?", [String(tplId)])
        );
    } catch (err) {
        console.error('读取模板失败:', err);
        return null;
    }
}

function setDownloadHeader(res, fileName) {
    const encoded = encodeURIComponent(fileName);
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''" + encoded);
}

module.exports = router;
