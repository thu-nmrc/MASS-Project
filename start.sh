#!/bin/bash

echo "========================================"
echo "  MASS - 多智能体社会模拟平台"
echo "  Multi-Agent Social Simulation Platform"
echo "========================================"
echo ""

echo "[1/2] 检查 Python 环境..."
if ! command -v python3 &> /dev/null; then
    echo "[错误] 未找到 Python3，请先安装 Python 3.7+"
    exit 1
fi

echo "[2/2] 启动服务器..."
echo ""
echo "服务器将在 http://127.0.0.1:8799 启动"
echo "按 Ctrl+C 停止服务器"
echo ""

python3 server.py
