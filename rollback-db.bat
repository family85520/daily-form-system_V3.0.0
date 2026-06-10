@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════╗
echo ║       每日数据填报系统 — 数据库回滚工具        ║
echo ╚══════════════════════════════════════════════╝
echo.

:: ===== 配置 =====
set "PROJECT_DIR=%~dp0"
set "DB_FILE=%PROJECT_DIR%data\app.db"
set "BACKUP_ROOT=%PROJECT_DIR%data\backups\manual"
set "AUTO_BACKUP_ROOT=%PROJECT_DIR%data\backups\auto"

:: ===== 检查数据库 =====
if not exist "%DB_FILE%" (
    echo ⚠ 数据库文件不存在: %DB_FILE%
    echo.
    pause
    exit /b 1
)

:: ===== 收集所有备份 =====
echo 正在扫描备份...
echo.

set "count=0"

:: 手动备份
if exist "%BACKUP_ROOT%" (
    for /f "delims=" %%d in ('dir /b /ad /o-n "%BACKUP_ROOT%" 2^>nul') do (
        if exist "%BACKUP_ROOT%\%%d\app.db" (
            set /a count+=1
            set "backup[!count!]=%BACKUP_ROOT%\%%d"
            set "btype[!count!]=手动"
            set "bname[!count!]=%%d"
        )
    )
)

:: 自动备份
if exist "%AUTO_BACKUP_ROOT%" (
    for /f "delims=" %%d in ('dir /b /ad /o-n "%AUTO_BACKUP_ROOT%" 2^>nul') do (
        if exist "%AUTO_BACKUP_ROOT%\%%d\app.db" (
            set /a count+=1
            set "backup[!count!]=%AUTO_BACKUP_ROOT%\%%d"
            set "btype[!count!]=自动"
            set "bname[!count!]=%%d"
        )
    )
)

:: snapshot 备份
if exist "%PROJECT_DIR%data\backups\snapshots" (
    for /f "delims=" %%f in ('dir /b /o-n "%PROJECT_DIR%data\backups\snapshots\*.db" 2^>nul') do (
        set /a count+=1
        set "backup[!count!]=%PROJECT_DIR%data\backups\snapshots\%%f"
        set "btype[!count!]=快照"
        set "bname[!count!]=%%f"
    )
)

if %count% equ 0 (
    echo   （无可用备份）
    echo   请先执行 backup.bat 创建备份，或等待自动备份
    echo.
    pause
    exit /b 1
)

echo 可用的数据库备份（共 %count% 个）:
echo.
echo   编号  类型  备份名称
echo   ────  ────  ─────────────────────────
for /l %%i in (1,1,%count%) do (
    echo   %%i     !btype[%%i]!  !bname[%%i]!
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

set "SELECTED=!backup[%choice%]!"

:: 判断是文件还是目录
set "SOURCE_DB="
if exist "%SELECTED%\app.db" (
    set "SOURCE_DB=%SELECTED%\app.db"
) else if exist "%SELECTED%" (
    :: 可能是快照文件本身
    set "SOURCE_DB=%SELECTED%"
)

if not defined SOURCE_DB (
    echo.
    echo ⚠ 备份中未找到数据库文件
    pause
    exit /b 1
)

echo.
echo 已选择: !btype[%choice%]! — !bname[%choice%]!
echo 文件: %SOURCE_DB%
echo.

:: 获取文件大小
for %%A in ("%SOURCE_DB%") do set "fsize=%%~zA"
echo   备份大小: %fsize% 字节
echo.

:: ===== 二次确认 =====
echo ┌─────────────────────────────────────────────┐
echo │  ⚠ 警告：回滚将覆盖当前数据库！              │
echo │                                             │
echo │  当前数据库将自动备份到安全位置               │
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

:: ===== 安全备份当前数据库 =====
echo [1/2] 备份当前数据库（安全措施）...
set "SAFETY_DIR=%PROJECT_DIR%data\backups\pre_db_rollback"
if not exist "%SAFETY_DIR%" mkdir "%SAFETY_DIR%"
set "SAFETY_FILE=%SAFETY_DIR%\app_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%.db"
set "SAFETY_FILE=%SAFETY_FILE: =0%"
copy "%DB_FILE%" "%SAFETY_FILE%" >nul
echo       ✓ 当前数据库已备份到: %SAFETY_FILE%

:: ===== 恢复数据库 =====
echo [2/2] 恢复数据库...
copy "%SOURCE_DB%" "%DB_FILE%" >nul
if errorlevel 1 (
    echo       ✗ 恢复失败！
    echo       当前数据库安全备份位于: %SAFETY_FILE%
    pause
    exit /b 1
)
echo       ✓ 数据库已恢复

echo.
echo ═══════════════════════════════════════════════
echo   数据库回滚完成！
echo   恢复自: !bname[%choice%]!
echo   安全备份: %SAFETY_FILE%
echo.
echo   请重启服务: npm run server
echo ═══════════════════════════════════════════════
echo.

pause
