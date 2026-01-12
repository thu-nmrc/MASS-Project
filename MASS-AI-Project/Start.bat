@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
echo ===============================================
echo   MASS Launcher 0.21  (flat)
echo ===============================================

REM 检查并关闭占用8799端口的进程
echo 正在检查端口8799占用情况...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8799 2^>nul') do (
    echo 发现占用端口8799的进程PID: %%a
    echo 正在关闭进程...
    taskkill /PID %%a /F >nul 2>nul
    if !errorlevel! equ 0 (
        echo 成功关闭进程 %%a
    ) else (
        echo 关闭进程 %%a 失败，可能权限不足
    )
)

REM 等待端口释放
echo 等待端口释放...
timeout /t 2 /nobreak >nul

REM 查找Python可执行文件
set "PYEXE="
where python >nul 2>nul && set "PYEXE=python"
if not defined PYEXE where py >nul 2>nul && set "PYEXE=py"
if not defined PYEXE (
    echo ERROR: Python not found. Install Python 3.x and add it to PATH.
    pause
    exit /b 1
)

REM 启动服务器（在后台）- 移除MASS_NO_OPEN设置，让服务器自动打开浏览器
echo 正在启动服务器: %PYEXE% server_stdlib.py --port=8799
start "MASS Server" /min "%PYEXE%" server_stdlib.py --port=8799
REM 等待服务器启动
echo 等待服务器启动...
timeout /t 5 /nobreak >nul
REM 检查服务器是否成功启动
netstat -ano | findstr :8799 >nul
if %errorlevel% equ 0 (
    echo 服务器启动成功！
    echo 浏览器将自动打开...
    REM 移除这里的 start http://localhost:8799
) else (
    echo 服务器启动失败，请检查错误信息
    pause
    exit /b 1
)

echo ===============================================
echo   服务器已启动，网页将自动打开
echo   如需关闭服务器，请关闭"MASS Server"窗口
echo ===============================================
echo 按任意键退出启动脚本...
pause >nul
