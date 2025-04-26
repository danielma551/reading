from text_indexer import TextIndexer
import os
from pathlib import Path

def create_test_files(base_dir: str):
    """创建测试文件"""
    test_files = {
        "文章1.txt": "这是第一篇文章的内容。\n讨论了Python编程的基础知识。",
        "文章2.txt": "这是第二篇文章。\n主要介绍了机器学习的应用。",
        "子目录/文章3.txt": "这是在子目录中的文章。\n包含了深度学习的介绍。"
    }
    
    for file_path, content in test_files.items():
        full_path = Path(base_dir) / file_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)

def main():
    # 创建测试目录
    base_dir = "test_texts"
    os.makedirs(base_dir, exist_ok=True)
    
    # 创建测试文件
    create_test_files(base_dir)
    
    # 初始化索引器
    indexer = TextIndexer(base_dir)
    
    # 扫描并索引文件
    print("正在索引文件...")
    new_files = indexer.scan_files()
    print(f"新索引的文件: {new_files}")
    
    # 测试搜索功能
    test_queries = [
        "Python",
        "机器学习",
        "深度",
        "文章"
    ]
    
    print("\n搜索测试:")
    for query in test_queries:
        print(f"\n查询: '{query}'")
        results = indexer.search(query)
        
        if results:
            print("找到以下结果：")
            for result in results:
                print(f"\n文件: {result['path']}")
                print(f"相关度: {result['score']:.4f}")
                print(f"最后修改: {result['modified']}")
                print(f"内容: {result['content']}")
                print("-" * 40)
        else:
            print("未找到相关结果")

if __name__ == "__main__":
    main()
