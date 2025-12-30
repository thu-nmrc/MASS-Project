#!/usr/bin/env python3
"""
MASS 系统打包脚本
使用 PyInstaller 将系统打包成独立的 exe 文件
"""

import os
import sys
import shutil
import subprocess

# MASS Project - originated by Xiaoli Hu (胡晓李)
# Copyright (c) 2025 Xiaoli Hu
# Licensed under the MIT License. See LICENSE file in the project root.

def check_pyinstaller():
    """检查 PyInstaller 是否安装"""
    try:
        import PyInstaller
        print("✓ PyInstaller 已安装")
        return True
    except ImportError:
        print("✗ PyInstaller 未安装")
        print("\n请运行以下命令安装：")
        print("  pip install pyinstaller")
        return False

def check_openpyxl():
    """检查 openpyxl 是否安装"""
    try:
        import openpyxl
        print("✓ openpyxl 已安装（Excel 导出功能可用）")
        return True
    except ImportError:
        print("⚠ openpyxl 未安装（Excel 导出功能不可用）")
        print("  如需 Excel 导出，请运行: pip install openpyxl")
        return False

def clean_build():
    """清理之前的构建文件"""
    print("\n清理旧的构建文件...")
    dirs_to_remove = ['build', 'dist', '__pycache__']
    files_to_remove = ['MASS.spec']
    
    for d in dirs_to_remove:
        if os.path.exists(d):
            shutil.rmtree(d)
            print(f"  删除目录: {d}")
    
    for f in files_to_remove:
        if os.path.exists(f):
            os.remove(f)
            print(f"  删除文件: {f}")

def build_exe():
    """构建 exe 文件"""
    print("\n开始构建 exe...")
    
    # PyInstaller 命令
    cmd = [
        'pyinstaller',
        '--name=MASS',
        '--onefile',  # 打包成单个文件
        '--console',  # 显示控制台窗口（方便查看日志）
        '--icon=static/icom.ico',  # 如果生成了 static/icon.ico，会被用作 exe 图标
        '--add-data=static;static',  # 添加 static 目录
        '--add-data=examples;examples',  # 添加 examples 目录
        '--hidden-import=openpyxl',  # 包含 openpyxl
        '--hidden-import=openpyxl.styles',
        '--collect-all=openpyxl',
        # 排除不需要的大型包
        '--exclude-module=numpy',
        '--exclude-module=pandas',
        '--exclude-module=matplotlib',
        '--exclude-module=scipy',
        '--exclude-module=torch',
        '--exclude-module=tensorflow',
        '--exclude-module=PyQt5',
        '--exclude-module=PySide6',
        '--exclude-module=tkinter',
        '--exclude-module=IPython',
        '--exclude-module=jupyter',
        '--exclude-module=notebook',
        '--exclude-module=pytest',
        '--exclude-module=sphinx',
        '--exclude-module=PIL',
        '--exclude-module=cv2',
        'server.py'
    ]
    
    print(f"\n执行命令: {' '.join(cmd)}\n")
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ 构建失败: {e}")
        print(e.stderr)
        return False

def create_portable_package():
    """创建便携版包"""
    print("\n创建便携版包...")
    
    if not os.path.exists('dist/MASS.exe'):
        print("✗ 未找到 MASS.exe")
        return False
    
    # 创建便携版目录
    portable_dir = 'MASS_Portable'
    if os.path.exists(portable_dir):
        shutil.rmtree(portable_dir)
    
    os.makedirs(portable_dir)
    
    # 复制文件
    print("  复制文件...")
    shutil.copy('dist/MASS.exe', portable_dir)
    shutil.copytree('static', os.path.join(portable_dir, 'static'))
    shutil.copytree('examples', os.path.join(portable_dir, 'examples'))
    
    # 创建必要的目录
    os.makedirs(os.path.join(portable_dir, 'exports'), exist_ok=True)
    
    # 复制文档
    docs = [
        'README.md',
        'README_CN.md',
        'QUICKSTART.md',
        '故障排除指南.md',
        '导入导出指南.md',
        'Excel导出说明.md',
        '使用说明.txt'
    ]
    
    for doc in docs:
        if os.path.exists(doc):
            shutil.copy(doc, portable_dir)
    
    # 创建启动说明
    with open(os.path.join(portable_dir, '启动说明.txt'), 'w', encoding='utf-8') as f:
        f.write("""═══════════════════════════════════════════════════════════════
  MASS 多智能体社会模拟平台 - 便携版
═══════════════════════════════════════════════════════════════

【启动方法】
双击 MASS.exe 即可启动

【首次使用】
1. 双击 MASS.exe
2. 浏览器会自动打开 http://127.0.0.1:8899
3. 配置 API 并开始使用

【文件说明】
├── MASS.exe              # 主程序
├── static/               # 前端文件
├── examples/             # 示例配置
├── exports/              # 导出目录
├── README_CN.md             # 使用说明（英文）
├── README_CN.md          # 使用说明（中文）
└── 其他文档...

【注意事项】
1. 首次启动可能需要几秒钟
2. 如果防火墙提示，请允许访问
3. 关闭程序：在浏览器中点击停止，或关闭命令行窗口

【需要帮助？】
查看 README_CN.md 或 README_CN.md

═══════════════════════════════════════════════════════════════
""")
    
    print(f"✓ 便携版已创建: {portable_dir}/")
    return True

def main():
    """主函数"""
    print("═" * 60)
    print("  MASS 系统打包工具")
    print("═" * 60)
    
    # 检查依赖
    print("\n检查依赖...")
    if not check_pyinstaller():
        return 1
    
    check_openpyxl()
    
    # 清理旧文件
    clean_build()
    
    # 构建 exe
    if not build_exe():
        print("\n✗ 构建失败")
        return 1
    
    print("\n✓ 构建成功！")
    print(f"  exe 文件位置: dist/MASS.exe")
    
    # 创建便携版
    if create_portable_package():
        print("\n✓ 便携版创建成功！")
        print(f"  位置: MASS_Portable/")
        print("\n可以将 MASS_Portable 文件夹打包分发")
    
    print("\n" + "═" * 60)
    print("  打包完成！")
    print("═" * 60)
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
