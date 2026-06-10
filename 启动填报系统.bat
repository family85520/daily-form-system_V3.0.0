@echo off
chcp 65001 >nul
title 每日数据填报系统
cd /d "%~dp0"
if not exist "data" mkdir data

echo.
echo  ==========================================
echo      每日数据填报系统 - 选择启动版本
echo  ==========================================
echo.
echo    [1] v2  Vue3 新版（默认）
echo    [2] v1  原版
echo.
echo  ==========================================
echo.

set /p VER=请输入版本编号 (1/2，直接回车默认 v2):

if "%VER%"=="2" (
    echo.
    echo  正在启动 v1 原版...
    set FRONTEND_VERSION=v1
) else (
    echo.
    echo  正在启动 v2 Vue3 新版...
    set FRONTEND_VERSION=v2
)

node\node.exe server.js
pause
