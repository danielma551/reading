from collections import defaultdict
import re
import math
from typing import Dict, List, Set, Tuple
from difflib import SequenceMatcher

class SearchIndex:
    def __init__(self):
        # 倒排索引: {term: {doc_id: [positions]}}
        self.inverted_index: Dict[str, Dict[str, List[int]]] = defaultdict(lambda: defaultdict(list))
        # 文档存储: {doc_id: document_content}
        self.documents: Dict[str, str] = {}
        # 文档长度: {doc_id: token_count}
        self.doc_lengths: Dict[str, int] = {}
        # 词项文档频率: {term: document_frequency}
        self.term_doc_freq: Dict[str, int] = defaultdict(int)
        
    def _tokenize(self, text: str) -> List[str]:
        """
        将文本分词，支持中文和英文
        """
        # 将所有标点符号替换为空格
        text = re.sub(r'[^\w\s\u4e00-\u9fff]', ' ', text)
        # 将文本按空格分词，保留中文字符
        tokens = re.findall(r'[\u4e00-\u9fff]|[a-zA-Z0-9]+', text.lower())
        return tokens

    def _calculate_similarity(self, term1: str, term2: str) -> float:
        """
        计算两个词的相似度
        """
        return SequenceMatcher(None, term1, term2).ratio()
    
    def _find_similar_terms(self, term: str, threshold: float = 0.8) -> List[str]:
        """
        找出与给定词相似的词项
        """
        similar_terms = []
        for indexed_term in self.inverted_index.keys():
            similarity = self._calculate_similarity(term, indexed_term)
            if similarity >= threshold:
                similar_terms.append(indexed_term)
        return similar_terms

    def add_document(self, doc_id: str, content: str) -> None:
        """
        添加文档到索引中
        :param doc_id: 文档唯一标识符
        :param content: 文档内容
        """
        self.documents[doc_id] = content
        tokens = self._tokenize(content)
        self.doc_lengths[doc_id] = len(tokens)
        
        # 记录词项在文档中的位置
        term_positions: Dict[str, List[int]] = defaultdict(list)
        for position, token in enumerate(tokens):
            term_positions[token].append(position)
        
        # 更新倒排索引和文档频率
        for term, positions in term_positions.items():
            self.inverted_index[term][doc_id] = positions
            self.term_doc_freq[term] += 1
    
    def _calculate_tfidf_score(self, term: str, doc_id: str) -> float:
        """
        计算词项在文档中的TF-IDF得分
        """
        if term not in self.inverted_index or doc_id not in self.inverted_index[term]:
            return 0.0
        
        # 计算词频 (TF)
        tf = len(self.inverted_index[term][doc_id]) / self.doc_lengths[doc_id]
        
        # 计算逆文档频率 (IDF)
        total_docs = len(self.documents)
        doc_freq = self.term_doc_freq[term]
        idf = math.log(total_docs / (1 + doc_freq))
        
        return tf * idf
    
    def search(self, query: str, max_results: int = 10, fuzzy_match: bool = True, min_similarity: float = 0.8) -> List[Tuple[str, float]]:
        """
        搜索查询
        :param query: 搜索查询字符串
        :param max_results: 最大返回结果数
        :param fuzzy_match: 是否启用模糊匹配
        :param min_similarity: 模糊匹配的最小相似度阈值
        :return: 按相关度排序的文档ID列表及其得分
        """
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return []
            
        # 计算每个文档的得分
        scores: Dict[str, float] = defaultdict(float)
        
        for token in query_tokens:
            # 直接匹配
            matching_docs = self.inverted_index.get(token, {})
            for doc_id in matching_docs:
                scores[doc_id] += self._calculate_tfidf_score(token, doc_id)
            
            # 模糊匹配
            if fuzzy_match:
                similar_terms = self._find_similar_terms(token, min_similarity)
                for similar_term in similar_terms:
                    if similar_term == token:
                        continue
                    similarity = self._calculate_similarity(token, similar_term)
                    for doc_id in self.inverted_index[similar_term]:
                        # 模糊匹配的得分要乘以相似度作为惩罚
                        scores[doc_id] += self._calculate_tfidf_score(similar_term, doc_id) * similarity
        
        # 按得分排序并返回前N个结果
        sorted_results = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return sorted_results[:max_results]
    
    def get_document(self, doc_id: str) -> str:
        """
        获取文档内容
        :param doc_id: 文档ID
        :return: 文档内容
        """
        return self.documents.get(doc_id, "")
