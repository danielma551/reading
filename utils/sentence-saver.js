// 保存句子到本地存储的工具函数

/**
 * 保存一个句子到收藏
 * @param {string} sentence - 要保存的句子
 * @param {string} source - 句子的来源（文本名称）
 * @param {number} position - 句子在原文中的位置
 * @returns {object} 保存结果和保存的句子对象
 */
export function saveSentence(sentence, source, position) {
  try {
    // 先检查 localStorage 是否可用
    if (!isLocalStorageAvailable()) {
      return {
        success: false,
        message: '浏览器存储不可用，请确保未开启隐私模式并允许网站使用本地存储',
      };
    }
    
    // 从本地存储获取现有收藏
    const savedSentencesJson = localStorage.getItem('savedSentences');
    const savedSentences = savedSentencesJson ? JSON.parse(savedSentencesJson) : [];
    
    // 创建新的句子对象
    const newSentence = {
      id: Date.now().toString(), // 使用时间戳作为唯一ID
      text: sentence,
      source: source || '未知来源',
      date: new Date().toISOString(),
      position: position
    };
    
    // 添加到收藏列表
    const updatedSentences = [...savedSentences, newSentence];
    
    // 使用 try-catch 单独包装存储操作，因为这是最容易失败的部分
    try {
      // 保存到本地存储
      localStorage.setItem('savedSentences', JSON.stringify(updatedSentences));
    } catch (storageError) {
      console.error('保存到 localStorage 失败:', storageError);
      return {
        success: false,
        message: '保存失败，存储空间可能已满或受限',
        error: storageError
      };
    }
    
    return {
      success: true,
      message: '句子已保存到笔记本',
      sentence: newSentence,
      count: updatedSentences.length
    };
  } catch (error) {
    console.error('保存句子失败:', error);
    return {
      success: false,
      message: '保存失败，请重试',
      error
    };
  }
}

/**
 * 检查 localStorage 是否可用
 * @returns {boolean} localStorage 是否可用
 */
function isLocalStorageAvailable() {
  try {
    // 尝试存储和获取一个测试值
    const testKey = '_test_localStorage_';
    localStorage.setItem(testKey, testKey);
    const result = localStorage.getItem(testKey) === testKey;
    localStorage.removeItem(testKey);
    return result;
  } catch (e) {
    return false;
  }
}

/**
 * 获取所有收藏的句子
 * @returns {Array} 收藏的句子列表
 */
export function getSavedSentences() {
  try {
    const savedSentencesJson = localStorage.getItem('savedSentences');
    return savedSentencesJson ? JSON.parse(savedSentencesJson) : [];
  } catch (error) {
    console.error('获取收藏句子失败:', error);
    return [];
  }
}

/**
 * 删除一个收藏的句子
 * @param {string} id - 要删除的句子ID
 * @returns {object} 删除结果
 */
export function deleteSentence(id) {
  try {
    // 获取现有收藏
    const savedSentences = getSavedSentences();
    
    // 过滤掉要删除的句子
    const updatedSentences = savedSentences.filter(sentence => sentence.id !== id);
    
    // 保存更新后的列表
    localStorage.setItem('savedSentences', JSON.stringify(updatedSentences));
    
    return {
      success: true,
      message: '已删除收藏的句子',
      count: updatedSentences.length
    };
  } catch (error) {
    console.error('删除句子失败:', error);
    return {
      success: false,
      message: '删除失败，请重试',
      error
    };
  }
}

/**
 * 清空所有收藏的句子
 * @returns {object} 操作结果
 */
export function clearAllSentences() {
  try {
    localStorage.removeItem('savedSentences');
    return {
      success: true,
      message: '已清空所有收藏的句子'
    };
  } catch (error) {
    console.error('清空收藏句子失败:', error);
    return {
      success: false,
      message: '操作失败，请重试',
      error
    };
  }
} 