from search_index import SearchIndex

def test_basic_search():
    print("\n=== 基础搜索测试 ===")
    search_idx = SearchIndex()
    
    # 添加测试文档
    documents = {
        "doc1": "Python是一种简单易学且功能强大的编程语言",
        "doc2": "Python支持面向对象编程，是一种高级语言",
        "doc3": "机器学习和人工智能经常使用Python开发",
        "doc4": "数据分析和科学计算是Python的优势领域"
    }
    
    for doc_id, content in documents.items():
        search_idx.add_document(doc_id, content)
    
    # 测试精确搜索
    query = "Python"
    print(f"\n精确搜索: '{query}'")
    results = search_idx.search(query, fuzzy_match=False)
    print_results(search_idx, results)

def test_fuzzy_search():
    print("\n=== 模糊匹配测试 ===")
    search_idx = SearchIndex()
    
    # 添加测试文档
    documents = {
        "doc1": "自然语言处理是AI的重要分支",
        "doc2": "语言学习需要大量练习",
        "doc3": "深度学习在自然语言处理中应用广泛",
        "doc4": "语言模型可以处理各种自然语言任务"
    }
    
    for doc_id, content in documents.items():
        search_idx.add_document(doc_id, content)
    
    # 测试模糊搜索
    queries = ["语言", "自然语言", "学习"]
    for query in queries:
        print(f"\n模糊搜索: '{query}'")
        results = search_idx.search(query, fuzzy_match=True, min_similarity=0.6)
        print_results(search_idx, results)

def print_results(search_idx, results):
    if results:
        print("找到以下相关文档：")
        for doc_id, score in results:
            print(f"文档ID: {doc_id}")
            print(f"相关度得分: {score:.4f}")
            print(f"内容: {search_idx.get_document(doc_id)}")
            print("-" * 30)
    else:
        print("未找到相关文档")

def main():
    test_basic_search()
    test_fuzzy_search()

if __name__ == "__main__":
    main()
