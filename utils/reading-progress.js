// 阅读进度和预计完成时间管理工具

/**
 * 保存图书阅读进度和预计完成时间
 * @param {number} textIndex - 图书索引
 * @param {number} progress - 当前阅读进度 (0-100)
 * @param {string} expectedFinishDate - 预计完成时间 (ISO格式日期字符串)
 * @returns {boolean} 保存结果
 */
export function saveReadingProgress(textIndex, progress, expectedFinishDate) {
  try {
    // 获取现有进度数据
    const savedProgressJson = localStorage.getItem('readingProgress');
    const savedProgress = savedProgressJson ? JSON.parse(savedProgressJson) : {};
    
    // 更新或添加当前图书的进度
    savedProgress[textIndex] = {
      progress: progress || 0,
      expectedFinishDate: expectedFinishDate || null,
      lastUpdated: new Date().toISOString()
    };
    
    // 保存到本地存储
    localStorage.setItem('readingProgress', JSON.stringify(savedProgress));
    
    return true;
  } catch (error) {
    console.error('保存阅读进度失败:', error);
    return false;
  }
}

/**
 * 获取图书的阅读进度信息
 * @param {number} textIndex - 图书索引
 * @returns {object|null} 进度信息对象或null (如果没有记录)
 */
export function getReadingProgress(textIndex) {
  try {
    const savedProgressJson = localStorage.getItem('readingProgress');
    if (!savedProgressJson) return null;
    
    const savedProgress = JSON.parse(savedProgressJson);
    return savedProgress[textIndex] || null;
  } catch (error) {
    console.error('获取阅读进度失败:', error);
    return null;
  }
}

/**
 * 获取所有图书的阅读进度
 * @returns {object} 所有图书的进度信息
 */
export function getAllReadingProgress() {
  try {
    const savedProgressJson = localStorage.getItem('readingProgress');
    return savedProgressJson ? JSON.parse(savedProgressJson) : {};
  } catch (error) {
    console.error('获取所有阅读进度失败:', error);
    return {};
  }
}

/**
 * 更新图书的阅读进度百分比
 * @param {number} textIndex - 图书索引
 * @param {number} progress - 当前阅读进度 (0-100)
 * @returns {boolean} 更新结果
 */
export function updateProgress(textIndex, progress) {
  try {
    const progressData = getReadingProgress(textIndex);
    if (progressData) {
      progressData.progress = progress;
      progressData.lastUpdated = new Date().toISOString();
      return saveReadingProgress(
        textIndex, 
        progressData.progress, 
        progressData.expectedFinishDate
      );
    } else {
      return saveReadingProgress(textIndex, progress, null);
    }
  } catch (error) {
    console.error('更新阅读进度失败:', error);
    return false;
  }
}

/**
 * 设置图书的预计完成时间
 * @param {number} textIndex - 图书索引
 * @param {string} expectedFinishDate - 预计完成时间 (ISO格式日期字符串)
 * @returns {boolean} 设置结果
 */
export function setExpectedFinishDate(textIndex, expectedFinishDate) {
  try {
    const progressData = getReadingProgress(textIndex);
    if (progressData) {
      progressData.expectedFinishDate = expectedFinishDate;
      progressData.lastUpdated = new Date().toISOString();
      return saveReadingProgress(
        textIndex, 
        progressData.progress, 
        progressData.expectedFinishDate
      );
    } else {
      return saveReadingProgress(textIndex, 0, expectedFinishDate);
    }
  } catch (error) {
    console.error('设置预计完成时间失败:', error);
    return false;
  }
}

/**
 * 计算预计完成剩余天数
 * @param {string} expectedFinishDate - 预计完成日期 (ISO格式)
 * @returns {number} 剩余天数 (负数表示已超期)
 */
export function calculateRemainingDays(expectedFinishDate) {
  if (!expectedFinishDate) return null;
  
  const today = new Date();
  const finishDate = new Date(expectedFinishDate);
  
  // 清除时间部分，只保留日期进行比较
  today.setHours(0, 0, 0, 0);
  finishDate.setHours(0, 0, 0, 0);
  
  const diffTime = finishDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * 删除图书的阅读进度记录
 * @param {number} textIndex - 图书索引
 * @returns {boolean} 删除结果
 */
export function deleteReadingProgress(textIndex) {
  try {
    const savedProgressJson = localStorage.getItem('readingProgress');
    if (!savedProgressJson) return true;
    
    const savedProgress = JSON.parse(savedProgressJson);
    if (savedProgress[textIndex]) {
      delete savedProgress[textIndex];
      localStorage.setItem('readingProgress', JSON.stringify(savedProgress));
    }
    
    return true;
  } catch (error) {
    console.error('删除阅读进度失败:', error);
    return false;
  }
}

/**
 * 格式化日期为易读格式 (YYYY-MM-DD)
 * @param {string} dateString - ISO格式日期字符串
 * @returns {string} 格式化后的日期
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}
