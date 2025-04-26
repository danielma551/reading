import os
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime
import json
from search_index import SearchIndex

class TextIndexer:
    def __init__(self, base_dir: str, index_file: str = "index_data.json"):
        """
        初始化文本索引器
        :param base_dir: 要索引的文本文件基础目录
        :param index_file: 索引数据保存的文件名
        """
        self.base_dir = Path(base_dir)
        self.index_file = self.base_dir / index_file
        self.search_index = SearchIndex()
        self.file_metadata: Dict[str, dict] = {}
        self._load_index()

    def _load_index(self):
        """加载已存在的索引数据"""
        if self.index_file.exists():
            try:
                with open(self.index_file, 'r', encoding='utf-8') as f:
                    self.file_metadata = json.load(f)
            except json.JSONDecodeError:
                self.file_metadata = {}

    def _save_index(self):
        """保存索引数据到文件"""
        with open(self.index_file, 'w', encoding='utf-8') as f:
            json.dump(self.file_metadata, f, ensure_ascii=False, indent=2)

    def _get_file_info(self, file_path: Path) -> dict:
        """获取文件信息"""
        stat = file_path.stat()
        return {
            'path': str(file_path.relative_to(self.base_dir)),
            'size': stat.st_size,
            'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
            'indexed': datetime.now().isoformat()
        }

    def scan_files(self) -> List[str]:
        """
        扫描目录下的所有txt文件并更新索引
        :return: 新索引的文件列表
        """
        new_files = []
        
        # 扫描所有txt文件
        for file_path in self.base_dir.rglob('*.txt'):
            relative_path = str(file_path.relative_to(self.base_dir))
            file_info = self._get_file_info(file_path)
            
            # 检查文件是否需要更新索引
            if relative_path not in self.file_metadata or \
               self.file_metadata[relative_path]['modified'] != file_info['modified']:
                try:
                    # 读取文件内容
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # 更新搜索索引
                    self.search_index.add_document(relative_path, content)
                    
                    # 更新文件元数据
                    self.file_metadata[relative_path] = file_info
                    new_files.append(relative_path)
                except Exception as e:
                    print(f"Error indexing {file_path}: {e}")
        
        # 删除不存在的文件的索引
        existing_files = {str(f.relative_to(self.base_dir)) 
                        for f in self.base_dir.rglob('*.txt')}
        for file_path in list(self.file_metadata.keys()):
            if file_path not in existing_files:
                del self.file_metadata[file_path]
        
        # 保存更新后的索引
        self._save_index()
        return new_files

    def search(self, query: str, 
              max_results: int = 10,
              fuzzy_match: bool = True,
              min_similarity: float = 0.8) -> List[dict]:
        """
        搜索文本内容
        :param query: 搜索查询
        :param max_results: 最大结果数
        :param fuzzy_match: 是否启用模糊匹配
        :param min_similarity: 模糊匹配的最小相似度
        :return: 搜索结果列表，每个结果包含文件信息和匹配内容
        """
        results = self.search_index.search(
            query, 
            max_results=max_results,
            fuzzy_match=fuzzy_match,
            min_similarity=min_similarity
        )
        
        # 整理搜索结果
        search_results = []
        for doc_id, score in results:
            if doc_id in self.file_metadata:
                result = {
                    **self.file_metadata[doc_id],
                    'score': score,
                    'content': self.search_index.get_document(doc_id)
                }
                search_results.append(result)
        
        return search_results

    def get_file_content(self, file_path: str) -> Optional[str]:
        """
        获取已索引文件的内容
        :param file_path: 文件相对路径
        :return: 文件内容，如果文件不存在则返回None
        """
        if file_path in self.file_metadata:
            return self.search_index.get_document(file_path)
        return None

if __name__ == "__main__":
    import argparse
    import json
    
    parser = argparse.ArgumentParser(description='Text indexing and search tool')
    parser.add_argument('--action', choices=['scan', 'search'], required=True,
                      help='Action to perform')
    parser.add_argument('--base-dir', required=True,
                      help='Base directory for text files')
    parser.add_argument('--query', help='Search query')
    parser.add_argument('--max-results', type=int, default=10,
                      help='Maximum number of results to return')
    parser.add_argument('--fuzzy-match', type=lambda x: x.lower() == 'true',
                      default=True, help='Enable fuzzy matching')
    parser.add_argument('--min-similarity', type=float, default=0.8,
                      help='Minimum similarity score for fuzzy matching')
    
    args = parser.parse_args()
    
    indexer = TextIndexer(args.base_dir)
    
    if args.action == 'scan':
        new_files = indexer.scan_files()
        print(json.dumps({'new_files': new_files}))
    elif args.action == 'search':
        if not args.query:
            print(json.dumps({
                'error': 'Query parameter is required for search action'
            }))
            exit(1)
            
        results = indexer.search(
            args.query,
            max_results=args.max_results,
            fuzzy_match=args.fuzzy_match,
            min_similarity=args.min_similarity
        )
        print(json.dumps({'results': results}))
