@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════╗
echo ║           每日数据填报系统 — 备份工具          ║
echo ╚══════════════════════════════════════════════╝
echo.

:: ===== 配置 =====
set "PROJECT_DIR=%~dp0"
set "BACKUP_ROOT=%PROJECT_DIR%data\backups\manual"
set "TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"
set "BACKUP_DIR=%BACKUP_ROOT%\backup_%TIMESTAMP%"

:: ===== 创建备份目录 =====
if not exist "%BACKUP_ROOT%" mkdir "%BACKUP_ROOT%"
mkdir "%BACKUP_DIR%"

echo [1/4] 备份数据库...
if exist "%PROJECT_DIR%data\app.db" (
    copy "%PROJECT_DIR%data\app.db" "%BACKUP_DIR%\app.db" >nul
    echo       ✓ 数据库已备份
) else (
    echo       ⚠ 数据库文件不存在，跳过
)

echo [2/4] 备份配置文件...
if exist "%PROJECT_DIR%data\config.json" (
    copy "%PROJECT_DIR%data\config.json" "%BACKUP_DIR%\config.json" >nul
    echo       ✓ 配置文件已备份
) else if exist "%PROJECT_DIR%src\config.js" (
    copy "%PROJECT_DIR%src\config.js" "%BACKUP_DIR%\config.js" >nul
    echo       ✓ 配置文件已备份 (src\config.js)
) else (
    echo       ℹ 配置在数据库中管理，无需单独备份
)

echo [3/4] 备份构建产物...
if exist "%PROJECT_DIR%dist" (
    xcopy "%PROJECT_DIR%dist" "%BACKUP_DIR%\dist\" /E /I /Q >nul
    echo       ✓ dist 目录已备份
) else (
    echo       ⚠ dist 目录不存在，跳过（可执行 npm run build 重新构建）
)

echo [4/4] 生成备份信息...
(
    echo 备份时间: %date% %time%
    echo 项目目录: %PROJECT_DIR%
    echo 备份内容: app.db, config.json, dist/
    echo.
    echo 恢复方法: 执行 rollback.bat 并选择此备份
) > "%BACKUP_DIR%\backup_info.txt"
echo       ✓ 备份信息已生成

echo.
echo ═══════════════════════════════════════════════
echo   备份完成！
echo   备份位置: %BACKUP_DIR%
echo ═══════════════════════════════════════════════
echo.

:: 列出最近的备份
echo 最近的备份:
echo.
set "count=0"
for /f "delims=" %%d in ('dir /b /ad /o-n "%BACKUP_ROOT%" 2^>nul') do (
    set /a count+=1
    if !count! leq 5 echo   !count!. %%d
)
echo.

pause
