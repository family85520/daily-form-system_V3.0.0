// scripts/snapshot-all.js
// 全量项目快照工具 — 备份/恢复所有项目文件

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = path.join(__dirname, '..');
const SNAPSHOT_DIR = path.join(PROJECT_DIR, 'data', 'backups', 'project-snapshots');
const MAX_SNAPSHOTS = 10;

// 排除的目录和文件
const EXCLUDE_DIRS = ['node_modules', 'dist', 'data', '.git', '.vscode'];
const EXCLUDE_FILES = ['.DS_Store', 'Thumbs.db'];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function timestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    now.getFullYear() + '-' +
    pad(now.getMonth() + 1) + '-' +
    pad(now.getDate()) + '_' +
    pad(now.getHours()) + '-' +
    pad(now.getMinutes()) + '-' +
    pad(now.getSeconds())
  );
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function shouldExclude(name, isDir) {
  if (EXCLUDE_DIRS.includes(name)) return true;
  if (EXCLUDE_FILES.includes(name)) return true;
  if (name.startsWith('.')) return true;
  return false;
}

// 递归复制目录
function copyDirSync(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  let fileCount = 0;

  for (const entry of entries) {
    if (shouldExclude(entry.name, entry.isDirectory())) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fileCount += copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      fileCount++;
    }
  }

  return fileCount;
}

// 递归删除目录
function removeDirSync(dir) {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        removeDirSync(fullPath);
      } else {
        fs.unlinkSync(fullPath);
      }
    });
    fs.rmdirSync(dir);
  }
}

// 统计目录大小和文件数
function getDirStats(dir) {
  let totalSize = 0;
  let fileCount = 0;

  function walk(d) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        const stat = fs.statSync(fullPath);
        totalSize += stat.size;
        fileCount++;
      }
    }
  }

  if (fs.existsSync(dir)) walk(dir);
  return { totalSize, fileCount };
}

// ===== 创建快照 =====
function createSnapshot() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║      每日数据填报系统 — 全量项目快照         ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  ensureDir(SNAPSHOT_DIR);

  const ts = timestamp();
  const snapshotName = 'backup_' + ts;
  const snapshotPath = path.join(SNAPSHOT_DIR, snapshotName);

  // [1/4] 复制项目文件
  console.log('  [1/4] 复制项目文件...');
  const fileCount = copyDirSync(PROJECT_DIR, snapshotPath);
  console.log('        ✓ 已复制 ' + fileCount + ' 个文件');

  // [2/4] 验证快照
  console.log('  [2/4] 验证快照...');
  const stats = getDirStats(snapshotPath);
  console.log('        ✓ 快照大小: ' + formatSize(stats.totalSize));
  console.log('        ✓ 文件数量: ' + stats.fileCount);

  // [3/4] 生成清单
  console.log('  [3/4] 生成文件清单...');
  const manifest = {
    name: snapshotName,
    timestamp: ts,
    date: new Date().toISOString(),
    fileCount: stats.fileCount,
    totalSize: stats.totalSize,
    description: '',
  };
  fs.writeFileSync(
    path.join(snapshotPath, '.snapshot-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('        ✓ 清单已生成');

  // [4/4] 清理旧快照
  console.log('  [4/4] 清理旧快照...');
  cleanupOldSnapshots();

  // 统计
  const allSnapshots = fs.readdirSync(SNAPSHOT_DIR)
    .filter(f => fs.statSync(path.join(SNAPSHOT_DIR, f)).isDirectory())
    .sort()
    .reverse();

  console.log('');
  console.log('  当前快照数量: ' + allSnapshots.length + '/' + MAX_SNAPSHOTS);
  console.log('  快照位置: ' + snapshotPath);
  console.log('');
  console.log('  最近的快照:');
  console.log('');
  allSnapshots.slice(0, 5).forEach((f, i) => {
    const fp = path.join(SNAPSHOT_DIR, f);
    const s = getDirStats(fp);
    console.log('    ' + (i + 1) + '. ' + f + '  (' + formatSize(s.totalSize) + ', ' + s.fileCount + ' 文件)');
  });
  console.log('');
}

// ===== 恢复快照 =====
function restoreSnapshot(snapshotName) {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║      每日数据填报系统 — 恢复项目快照         ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  const snapshotPath = path.join(SNAPSHOT_DIR, snapshotName);

  if (!fs.existsSync(snapshotPath)) {
    console.error('  ⚠ 快照不存在: ' + snapshotName);
    console.log('');
    console.log('  可用快照:');
    listSnapshots();
    process.exit(1);
  }

  // [1/4] 读取清单
  console.log('  [1/4] 读取快照清单...');
  const manifestPath = path.join(snapshotPath, '.snapshot-manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log('        快照时间: ' + manifest.date);
    console.log('        文件数量: ' + manifest.fileCount);
  }

  // [2/4] 备份当前文件（安全措施）
  console.log('  [2/4] 备份当前文件（恢复前安全备份）...');
  const preRestoreBackup = 'pre-restore_' + timestamp();
  const preRestorePath = path.join(SNAPSHOT_DIR, preRestoreBackup);
  const preFileCount = copyDirSync(PROJECT_DIR, preRestorePath);
  console.log('        ✓ 已备份 ' + preFileCount + ' 个文件到 ' + preRestoreBackup);

  // [3/4] 恢复文件
  console.log('  [3/4] 恢复项目文件...');
  const entries = fs.readdirSync(PROJECT_DIR, { withFileTypes: true });
  let deletedCount = 0;

  // 删除当前项目文件（排除排除列表）
  for (const entry of entries) {
    if (shouldExclude(entry.name, entry.isDirectory())) continue;

    const fullPath = path.join(PROJECT_DIR, entry.name);
    if (entry.isDirectory()) {
      removeDirSync(fullPath);
    } else {
      fs.unlinkSync(fullPath);
    }
    deletedCount++;
  }
  console.log('        已清理 ' + deletedCount + ' 个项目文件/目录');

  // 从快照复制（排除清单文件）
  let restoredCount = 0;
  const snapshotEntries = fs.readdirSync(snapshotPath, { withFileTypes: true });
  for (const entry of snapshotEntries) {
    if (entry.name === '.snapshot-manifest.json') continue;

    const srcPath = path.join(snapshotPath, entry.name);
    const destPath = path.join(PROJECT_DIR, entry.name);

    if (entry.isDirectory()) {
      restoredCount += copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      restoredCount++;
    }
  }
  console.log('        ✓ 已恢复 ' + restoredCount + ' 个文件');

  // [4/4] 验证
  console.log('  [4/4] 验证恢复结果...');
  const projectStats = getDirStats(PROJECT_DIR);
  console.log('        ✓ 项目文件数: ' + projectStats.fileCount);

  console.log('');
  console.log('  ✓ 恢复完成！');
  console.log('');
  console.log('  恢复前备份: ' + preRestorePath);
  console.log('  如果恢复有误，可以用以下命令回退:');
  console.log('    node scripts/snapshot-all.js restore ' + preRestoreBackup);
  console.log('');
}

// ===== 列出快照 =====
function listSnapshots() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║      每日数据填报系统 — 项目快照列表         ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  ensureDir(SNAPSHOT_DIR);

  const allSnapshots = fs.readdirSync(SNAPSHOT_DIR)
    .filter(f => fs.statSync(path.join(SNAPSHOT_DIR, f)).isDirectory())
    .sort()
    .reverse();

  if (!allSnapshots.length) {
    console.log('  暂无快照');
    console.log('');
    return;
  }

  console.log('  共 ' + allSnapshots.length + ' 个快照:');
  console.log('');
  console.log('  ' + '#'.padEnd(4) + '名称'.padEnd(30) + '大小'.padEnd(12) + '文件数');
  console.log('  ' + '─'.repeat(60));

  allSnapshots.forEach((f, i) => {
    const fp = path.join(SNAPSHOT_DIR, f);
    const manifestPath = path.join(fp, '.snapshot-manifest.json');
    let fileCount = '?';

    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      fileCount = String(manifest.fileCount);
    } else {
      const stats = getDirStats(fp);
      fileCount = String(stats.fileCount);
    }

    const stats = getDirStats(fp);
    console.log('  ' + String(i + 1).padEnd(4) + f.padEnd(30) + formatSize(stats.totalSize).padEnd(12) + fileCount);
  });

  console.log('');
  console.log('  使用方法:');
  console.log('    创建快照: node scripts/snapshot-all.js create');
  console.log('    恢复快照: node scripts/snapshot-all.js restore <快照名称>');
  console.log('');
}

// ===== 删除指定快照 =====
function deleteSnapshot(snapshotName) {
  console.log('');
  const snapshotPath = path.join(SNAPSHOT_DIR, snapshotName);

  if (!fs.existsSync(snapshotPath)) {
    console.error('  ⚠ 快照不存在: ' + snapshotName);
    process.exit(1);
  }

  const stats = getDirStats(snapshotPath);
  removeDirSync(snapshotPath);
  console.log('  ✓ 已删除快照: ' + snapshotName + ' (' + formatSize(stats.totalSize) + ')');
  console.log('');
}

// ===== 清理旧快照 =====
function cleanupOldSnapshots() {
  const allSnapshots = fs.readdirSync(SNAPSHOT_DIR)
    .filter(f => fs.statSync(path.join(SNAPSHOT_DIR, f)).isDirectory())
    .sort()
    .reverse();

  if (allSnapshots.length <= MAX_SNAPSHOTS) return;

  const toDelete = allSnapshots.slice(MAX_SNAPSHOTS);
  toDelete.forEach(f => {
    const fp = path.join(SNAPSHOT_DIR, f);
    removeDirSync(fp);
    console.log('  🗑  清理旧快照: ' + f);
  });
}

// ===== 命令行入口 =====
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'create':
    createSnapshot();
    break;

  case 'restore':
    if (!args[1]) {
      console.error('');
      console.error('  ⚠ 请指定快照名称');
      console.error('  用法: node scripts/snapshot-all.js restore <快照名称>');
      console.error('');
      listSnapshots();
      process.exit(1);
    }
    restoreSnapshot(args[1]);
    break;

  case 'list':
    listSnapshots();
    break;

  case 'delete':
    if (!args[1]) {
      console.error('  ⚠ 请指定快照名称');
      process.exit(1);
    }
    deleteSnapshot(args[1]);
    break;

  default:
    console.log('');
    console.log('  全量项目快照工具');
    console.log('');
    console.log('  用法:');
    console.log('    node scripts/snapshot-all.js create              创建快照');
    console.log('    node scripts/snapshot-all.js list                列出快照');
    console.log('    node scripts/snapshot-all.js restore <名称>      恢复快照');
    console.log('    node scripts/snapshot-all.js delete <名称>       删除快照');
    console.log('');
}
