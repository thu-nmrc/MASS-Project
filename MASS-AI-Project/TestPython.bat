@echo off
echo 测试Python安装...
python --version
if %ERRORLEVEL% EQU 0 (
    echo Python已成功安装!
    echo 版本: %PYTHON_VERSION%
) else (
    echo 未找到Python。请检查是否已安装Python并添加到PATH。
)
pause