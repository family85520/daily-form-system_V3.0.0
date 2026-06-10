@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════╗
echo ║         每日数据填报系统 — 回滚工具            ║
echo ╚══════════════════════════════════════════════╝
echo.

:: ===== 配置 =====
set "PROJECT_DIR=%~dp0"
set "BACKUP_ROOT=%PROJECT_DIR%data\backups\manual"

:: ===== 检查备份目录 =====
if not exist "%BACKUP_ROOT%" (
    echo ⚠ 备份目录不存在: %BACKUP_ROOT%
    echo   请先执行 backup.bat 创建备份
    echo.
    pause
    exit /b 1
)

:: ===== 列出可用备份 =====
echo 可用的备份:
echo.
set "count=0"
for /f "delims=" %%d in ('dir /b /ad /o-n "%BACKUP_ROOT%" 2^>nul') do (
    set /a count+=1
    set "backup[!count!]=%%d"
    echo   !count!. %%d
)

if %count% equ 0 (
    echo   （无备份）
    echo.
    pause
    exit /b 1
)

echo.
set /p "choice=请选择要恢复的备份编号 [1-%count%]: "

:: 验证输入
if not defined backup[%choice%] (
    echo.
    echo ⚠ 无效的编号
    pause
    exit /b 1
)

set "SELECTED=%BACKUP_ROOT%\!backup[%choice%]!"
echo.
echo 已选择: !backup[%choice%]!
echo.

:: 显示备份信息
if exist "%SELECTED%\backup_info.txt" (
    echo 备份信息:
    type "%SELECTED%\backup_info.txt"
    echo.
)

:: ===== 二次确认 =====
echo ┌─────────────────────────────────────────────┐
echo │  ⚠ 警告：回滚操作将覆盖当前数据！            │
echo │                                             │
echo │  建议先执行 backup.bat 备份当前数据           │
echo └─────────────────────────────────────────────┘
echo.
set /p "confirm=确认回滚？输入 YES 继续: "
if /i not "%confirm%"=="YES" (
    echo.
    echo 已取消
    pause
    exit /b 0
)

echo.
echo 开始回滚...

:: ===== 先备份当前数据 =====
echo [0/3] 备份当前数据（安全措施）...
set "SAFETY_DIR=%BACKUP_ROOT%\pre_rollback_%TIMESTAMP%"
mkdir "%SAFETY_DIR%" 2>nul
if exist "%PROJECT_DIR%data\app.db" copy "%PROJECT_DIR%data\app.db" "%SAFETY_DIR%\app.db" >nul
if exist "%PROJECT_DIR%data\config.json" copy "%PROJECT_DIR%data\config.json" "%SAFETY_DIR%\config.json" >nul
if exist "%PROJECT_DIR%dist" xcopy "%PROJECT_DIR%dist" "%SAFETY_DIR%\dist\" /E /I /Q >nul
echo       ✓ 当前数据已备份到: %SAFETY_DIR%

:: ===== 恢复数据库 =====
echo [1/3] 恢复数据库...
if exist "%SELECTED%\app.db" (
    copy "%SELECTED%\app.db" "%PROJECT_DIR%data\app.db" >nul
    echo       ✓ 数据库已恢复
) else (
    echo       ⚠ 备份中无数据库文件，跳过
)

:: ===== 恢复配置 =====
echo [2/3] 恢复配置文件...
if exist "%SELECTED%\config.json" (
    copy "%SELECTED%\config.json" "%PROJECT_DIR%data\config.json" >nul
    echo       ✓ 配置文件已恢复
) else if exist "%SELECTED%\config.js" (
    copy "%SELECTED%\config.js" "%PROJECT_DIR%src\config.js" >nul
    echo       ✓ 配置文件已恢复 (src\config.js)
) else (
    echo       ℹ 备份中无配置文件，跳过
)

:: ===== 恢复构建产物 =====
echo [3/3] 恢复构建产物...
if exist "%SELECTED%\dist" (
    if exist "%PROJECT_DIR%dist" rmdir /s /q "%PROJECT_DIR%dist"
    xcopy "%SELECTED%\dist" "%PROJECT_DIR%dist\" /E /I /Q >nul
    echo       ✓ dist 目录已恢复
) else (
    echo       ⚠ 备份中无 dist 目录，跳过
)

echo.
echo ═══════════════════════════════════════════════
echo   回滚完成！
echo   恢复自: !backup[%choice%]!
echo   安全备份: %SAFETY_DIR%
echo.
echo   如需重启服务请执行: npm run server
echo ═══════════════════════════════════════════════
echo.

pause
