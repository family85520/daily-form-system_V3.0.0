// scripts/snapshot.js
// 数据库快照工具 — 手动创建数据库快照备份

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = path.join(__dirname, '..');
const DB_FILE = path.join(PROJECT_DIR, 'data', 'app.db');
const SNAPSHOT_DIR = path.join(PROJECT_DIR, 'data', 'backups', 'snapshots');

// 最大快照数量
const MAX_SNAPSHOTS = 20;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function timestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    now.getFullYear() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) + '_' +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function cleanupOldSnapshots() {
  const files = fs.readdirSync(SNAPSHOT_DIR)
    .filter(f => f.endsWith('.db'))
    .sort()
    .reverse();

  if (files.length <= MAX_SNAPSHOTS) return;

  const toDelete = files.slice(MAX_SNAPSHOTS);
  toDelete.forEach(f => {
    const fp = path.join(SNAPSHOT_DIR, f);
    fs.unlinkSync(fp);
    console.log('  🗑  清理旧快照: ' + f);
  });
}

function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║        每日数据填报系统 — 数据库快照          ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // 检查数据库
  if (!fs.existsSync(DB_FILE)) {
    console.error('  ⚠ 数据库文件不存在: ' + DB_FILE);
    process.exit(1);
  }

  // 创建快照目录
  ensureDir(SNAPSHOT_DIR);

  // 生成快照文件名
  const ts = timestamp();
  const snapshotName = 'snapshot_' + ts + '.db';
  const snapshotPath = path.join(SNAPSHOT_DIR, snapshotName);

  // 获取数据库大小
  const stat = fs.statSync(DB_FILE);
  console.log('  数据库大小: ' + formatSize(stat.size));
  console.log('  快照文件:   ' + snapshotName);
  console.log('');

  // 复制数据库
  console.log('  [1/3] 创建快照...');
  fs.copyFileSync(DB_FILE, snapshotPath);
  console.log('        ✓ 快照已创建');

  // 验证快照
  console.log('  [2/3] 验证快照...');
  const snapshotStat = fs.statSync(snapshotPath);
  if (snapshotStat.size === stat.size) {
    console.log('        ✓ 文件大小一致 (' + formatSize(snapshotStat.size) + ')');
  } else {
    console.error('        ✗ 文件大小不一致！原: ' + stat.size + ' 快照: ' + snapshotStat.size);
    process.exit(1);
  }

  // 清理旧快照
  console.log('  [3/3] 清理旧快照...');
  cleanupOldSnapshots();

  // 统计
  const allSnapshots = fs.readdirSync(SNAPSHOT_DIR).filter(f => f.endsWith('.db'));
  console.log('');
  console.log('  当前快照数量: ' + allSnapshots.length + '/' + MAX_SNAPSHOTS);
  console.log('');
  console.log('  快照位置: ' + snapshotPath);
  console.log('');

  // 列出最近快照
  console.log('  最近的快照:');
  console.log('');
  allSnapshots.sort().reverse().slice(0, 5).forEach((f, i) => {
    const fp = path.join(SNAPSHOT_DIR, f);
    const s = fs.statSync(fp);
    console.log('    ' + (i + 1) + '. ' + f + '  (' + formatSize(s.size) + ')');
  });
  console.log('');
}

main();
