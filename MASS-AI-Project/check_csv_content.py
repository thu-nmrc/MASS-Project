import pandas as pd
import os

def check_csv_files():
    export_dir = "Export"
    
    if not os.path.exists(export_dir):
        print("Export目录不存在")
        return
    
    # 检查所有CSV文件
    csv_files = [f for f in os.listdir(export_dir) if f.endswith('.csv')]
    
    if not csv_files:
        print("没有找到CSV文件")
        return
    
    for filename in sorted(csv_files):
        filepath = os.path.join(export_dir, filename)
        print(f"\n=== {filename} ===")
        
        try:
            # 获取文件大小
            file_size = os.path.getsize(filepath)
            print(f"文件大小: {file_size} 字节")
            
            # 读取CSV文件
            df = pd.read_csv(filepath, encoding='utf-8-sig')
            
            print(f"行数: {len(df)}")
            print(f"列数: {len(df.columns)}")
            print(f"列名: {list(df.columns)}")
            
            if len(df) > 0:
                print("前几行数据:")
                print(df.head())
            else:
                print("文件为空（只有表头）")
                
        except Exception as e:
            print(f"读取文件失败: {e}")

if __name__ == "__main__":
    check_csv_files()