@echo off
chcp 65001 >nul
title MASS 多智能体社会模拟平台

echo ========================================
echo   MASS - 多智能体社会模拟平台
echo   Multi-Agent Social Simulation Platform
echo ========================================
echo.

echo [1/2] 检查 Python 环境...
venv\Scripts\python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python，请先安装 Python 3.7+
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [2/2] 启动服务器...
echo.
echo 服务器将在 http://127.0.0.1:8899 启动
echo 按 Ctrl+C 停止服务器
echo.

venv\Scripts\python server.py

pause
