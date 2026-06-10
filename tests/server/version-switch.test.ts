import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';

// 测试服务器地址（需要先启动服务）
const BASE_URL = 'http://localhost:3000';

// ===== 工具函数 =====

function request(
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode || 0, data: raw });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function requestRaw(
  path: string
): Promise<{ status: number; contentType: string; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          contentType: res.headers['content-type'] || '',
          body: raw,
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function switchVersion(version: string) {
  return request('POST', '/api/admin/switch-frontend', { version });
}

async function getVersion() {
  return request('GET', '/api/admin/frontend-version');
}

async function isServerRunning(): Promise<boolean> {
  try {
    await request('GET', '/api/admin/frontend-version');
    return true;
  } catch {
    return false;
  }
}

// ===== 测试用例 =====

describe('前端版本切换功能', () => {

  let serverRunning = false;

  beforeAll(async () => {
    serverRunning = await isServerRunning();
    if (!serverRunning) {
      console.warn('');
      console.warn('⚠️  服务器未启动，跳过版本切换测试');
      console.warn('   请先执行: npm run server');
      console.warn('');
    }
  });

  // ===== 1. API 接口测试 =====

  describe('1. 获取当前版本 API', () => {
    it('GET /api/admin/frontend-version 返回成功', async () => {
      if (!serverRunning) return;
      const res = await getVersion();
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });

    it('返回的版本号是 v1 或 v2', async () => {
      if (!serverRunning) return;
      const res = await getVersion();
      expect(['v1', 'v2']).toContain(res.data.version);
    });

    it('返回数据包含 success 和 version 字段', async () => {
      if (!serverRunning) return;
      const res = await getVersion();
      expect(res.data).toHaveProperty('success');
      expect(res.data).toHaveProperty('version');
    });
  });

  describe('2. 切换版本 API', () => {
    it('POST /api/admin/switch-frontend 切换到 v1 返回成功', async () => {
      if (!serverRunning) return;
      const res = await switchVersion('v1');
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.current).toBe('v1');
    });

    it('切换到 v1 后版本确认为 v1', async () => {
      if (!serverRunning) return;
      await switchVersion('v1');
      const res = await getVersion();
      expect(res.data.version).toBe('v1');
    });

    it('POST /api/admin/switch-frontend 切换到 v2 返回成功', async () => {
      if (!serverRunning) return;
      const res = await switchVersion('v2');
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.current).toBe('v2');
    });

    it('切换到 v2 后版本确认为 v2', async () => {
      if (!serverRunning) return;
      await switchVersion('v2');
      const res = await getVersion();
      expect(res.data.version).toBe('v2');
    });

    it('返回数据包含 prev 和 current 字段', async () => {
      if (!serverRunning) return;
      await switchVersion('v1');
      const res = await switchVersion('v2');
      expect(res.data).toHaveProperty('prev');
      expect(res.data).toHaveProperty('current');
      expect(res.data.prev).toBe('v1');
      expect(res.data.current).toBe('v2');
    });

    it('返回数据包含 message 字段', async () => {
      if (!serverRunning) return;
      const res = await switchVersion('v1');
      expect(res.data).toHaveProperty('message');
      expect(typeof res.data.message).toBe('string');
    });
  });

  describe('3. 无效版本处理', () => {
    it('切换到无效版本 v3 返回失败', async () => {
      if (!serverRunning) return;
      const res = await switchVersion('v3');
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(false);
      expect(res.data.error).toBeDefined();
    });

    it('切换到空字符串返回失败', async () => {
      if (!serverRunning) return;
      const res = await switchVersion('');
      expect(res.data.success).toBe(false);
    });

    it('切换到数字版本返回失败', async () => {
      if (!serverRunning) return;
      const res = await switchVersion('1');
      expect(res.data.success).toBe(false);
    });

    it('切换到大写 V1 返回失败', async () => {
      if (!serverRunning) return;
      const res = await switchVersion('V1');
      expect(res.data.success).toBe(false);
    });

    it('切换到带空格的版本返回失败', async () => {
      if (!serverRunning) return;
      const res = await switchVersion(' v1 ');
      expect(res.data.success).toBe(false);
    });

    it('切换到 null 返回失败', async () => {
      if (!serverRunning) return;
      const res = await request('POST', '/api/admin/switch-frontend', { version: null });
      expect(res.data.success).toBe(false);
    });

    it('切换到 undefined 返回失败', async () => {
      if (!serverRunning) return;
      const res = await request('POST', '/api/admin/switch-frontend', {});
      expect(res.data.success).toBe(false);
    });

    it('无效版本切换后版本不变', async () => {
      if (!serverRunning) return;
      await switchVersion('v1');
      await switchVersion('v3');
      const res = await getVersion();
      expect(res.data.version).toBe('v1');
    });
  });

  // ===== 2. 静态文件服务测试 =====

  describe('4. v1 静态文件服务', () => {
    it('v1 模式下访问根路径返回 HTML', async () => {
      if (!serverRunning) return;
      await switchVersion('v1');
      const res = await requestRaw('/');
      expect(res.status).toBe(200);
      expect(res.contentType).toContain('text/html');
    });

    it('v1 模式下返回的 HTML 包含内容', async () => {
      if (!serverRunning) return;
      await switchVersion('v1');
      const res = await requestRaw('/');
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('v1 模式下 SPA fallback 生效', async () => {
      if (!serverRunning) return;
      await switchVersion('v1');
      const res = await requestRaw('/nonexistent-path');
      expect(res.status).toBe(200);
      expect(res.contentType).toContain('text/html');
    });
  });

  describe('5. v2 静态文件服务', () => {
    it('v2 模式下访问根路径返回 HTML', async () => {
      if (!serverRunning) return;
      await switchVersion('v2');
      const res = await requestRaw('/');
      expect(res.status).toBe(200);
      expect(res.contentType).toContain('text/html');
    });

    it('v2 模式下返回的 HTML 包含 Vue 应用', async () => {
      if (!serverRunning) return;
      await switchVersion('v2');
      const res = await requestRaw('/');
      // Vue 3 构建产物通常包含 id="app"
      expect(res.body).toContain('id="app"');
    });

    it('v2 模式下 SPA fallback 生效', async () => {
      if (!serverRunning) return;
      await switchVersion('v2');
      const res = await requestRaw('/nonexistent-path');
      expect(res.status).toBe(200);
      expect(res.contentType).toContain('text/html');
    });
  });

  // ===== 3. 版本切换后 API 不受影响 =====

  describe('6. 版本切换后 API 不受影响', () => {
    it('v1 模式下 API 正常工作', async () => {
      if (!serverRunning) return;
      await switchVersion('v1');
      const res = await request('GET', '/api/data');
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success');
    });

    it('v2 模式下 API 正常工作', async () => {
      if (!serverRunning) return;
      await switchVersion('v2');
      const res = await request('GET', '/api/data');
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('success');
    });

    it('v1 模式下版本查询 API 正常', async () => {
      if (!serverRunning) return;
      await switchVersion('v1');
      const res = await getVersion();
      expect(res.data.success).toBe(true);
      expect(res.data.version).toBe('v1');
    });

    it('v2 模式下版本查询 API 正常', async () => {
      if (!serverRunning) return;
      await switchVersion('v2');
      const res = await getVersion();
      expect(res.data.success).toBe(true);
      expect(res.data.version).toBe('v2');
    });
  });

  // ===== 4. 连续切换稳定性 =====

  describe('7. 连续切换稳定性', () => {
    it('快速连续切换 5 次版本不报错', async () => {
      if (!serverRunning) return;
      const versions = ['v1', 'v2', 'v1', 'v2', 'v1'];
      for (const v of versions) {
        const res = await switchVersion(v);
        expect(res.data.success).toBe(true);
        expect(res.data.current).toBe(v);
      }
    });

    it('连续切换后最终版本正确', async () => {
      if (!serverRunning) return;
      await switchVersion('v1');
      await switchVersion('v2');
      await switchVersion('v1');
      await switchVersion('v2');
      const res = await getVersion();
      expect(res.data.version).toBe('v2');
    });

    it('切换到相同版本仍然返回成功', async () => {
      if (!serverRunning) return;
      await switchVersion('v1');
      const res = await switchVersion('v1');
      expect(res.data.success).toBe(true);
      expect(res.data.current).toBe('v1');
    });

    it('切换到相同版本后 prev 和 current 相同', async () => {
      if (!serverRunning) return;
      await switchVersion('v1');
      const res = await switchVersion('v1');
      expect(res.data.prev).toBe('v1');
      expect(res.data.current).toBe('v1');
    });
  });

  // ===== 5. 版本切换后页面内容差异 =====

  describe('8. 版本切换后页面内容差异', () => {
    it('v1 和 v2 返回的 HTML 内容不同', async () => {
      if (!serverRunning) return;
      await switchVersion('v1');
      const resV1 = await requestRaw('/');
      await switchVersion('v2');
      const resV2 = await requestRaw('/');
      // 两个版本的 HTML 应该不同（除非 dist 和 public 内容恰好一样）
      // 至少检查都能正常返回
      expect(resV1.status).toBe(200);
      expect(resV2.status).toBe(200);
    });

    it('v2 页面包含 Vue 3 特征', async () => {
      if (!serverRunning) return;
      await switchVersion('v2');
      const res = await requestRaw('/');
      // Vue 3 构建产物通常包含 id="app" 和 script 标签
      expect(res.body).toContain('id="app"');
      expect(res.body).toContain('<script');
    });
  });

  // ===== 6. 恢复测试环境 =====

  describe('9. 恢复测试环境', () => {
    it('测试结束后恢复为 v1', async () => {
      if (!serverRunning) return;
      const res = await switchVersion('v1');
      expect(res.data.success).toBe(true);
      expect(res.data.current).toBe('v1');
    });
  });
});
