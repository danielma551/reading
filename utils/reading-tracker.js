/**
 * 阅读追踪工具 - 记录每本书的日阅读量
 */

// 获取当前日期字符串 (YYYY-MM-DD 格式)
const getDateString = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// 保存阅读进度
export const saveReadingProgress = (bookId, sentencesRead) => {
  try {
    // 获取当前日期
    const dateStr = getDateString();
    
    // 获取已有数据
    const storedData = localStorage.getItem('readingProgress');
    const progressData = storedData ? JSON.parse(storedData) : {};
    
    // 初始化书籍数据结构（如果不存在）
    if (!progressData[bookId]) {
      progressData[bookId] = {
        title: bookId.split('.txt')[0], // 从文件名提取标题
        totalReadCount: 0,
        lastPosition: 0,
        startDate: dateStr,
        dailyRecords: {}
      };
    }
    
    // 兼容旧数据结构
    if (!progressData[bookId].dailyRecords) {
      // 转换旧结构到新结构
      const oldData = {...progressData[bookId]};
      progressData[bookId] = {
        title: bookId.split('.txt')[0],
        totalReadCount: 0,
        lastPosition: 0,
        startDate: dateStr,
        dailyRecords: {}
      };
      
      // 将旧的日期数据转移到新结构
      Object.keys(oldData).forEach(date => {
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) { // 确认是日期格式
          progressData[bookId].dailyRecords[date] = {
            count: oldData[date],
            duration: 0,
            startPosition: 0,
            endPosition: oldData[date]
          };
          progressData[bookId].totalReadCount += oldData[date];
        }
      });
    }
    
    // 初始化日期数据（如果不存在）
    if (!progressData[bookId].dailyRecords[dateStr]) {
      progressData[bookId].dailyRecords[dateStr] = {
        count: 0,
        duration: 0,
        startPosition: progressData[bookId].lastPosition,
        endPosition: progressData[bookId].lastPosition
      };
    }
    
    // 更新当日阅读量
    progressData[bookId].dailyRecords[dateStr].count = sentencesRead;
    progressData[bookId].lastPosition = sentencesRead;
    
    // 重新计算总阅读量
    progressData[bookId].totalReadCount = Object.values(progressData[bookId].dailyRecords)
      .reduce((sum, record) => sum + record.count, 0);
    
    // 保存回本地存储
    localStorage.setItem('readingProgress', JSON.stringify(progressData));
    
    return true;
  } catch (error) {
    console.error('保存阅读进度失败:', error);
    return false;
  }
};

// 获取书籍当日阅读量
export const getTodayReadingCount = (bookId) => {
  try {
    const dateStr = getDateString();
    const storedData = localStorage.getItem('readingProgress');
    
    if (!storedData) return 0;
    
    const progressData = JSON.parse(storedData);
    
    // 兼容新旧数据结构
    if (progressData[bookId]) {
      if (progressData[bookId].dailyRecords && progressData[bookId].dailyRecords[dateStr]) {
        return progressData[bookId].dailyRecords[dateStr].count || 0;
      } else if (progressData[bookId][dateStr]) {
        // 旧数据结构
        return progressData[bookId][dateStr] || 0;
      }
    }
    return 0;
  } catch (error) {
    console.error('获取当日阅读量失败:', error);
    return 0;
  }
};

// 获取书籍过去7天阅读数据
export const getWeekReadingData = (bookId) => {
  try {
    const storedData = localStorage.getItem('readingProgress');
    if (!storedData) return [];
    
    const progressData = JSON.parse(storedData);
    if (!progressData[bookId]) return [];
    
    // 生成过去7天的日期数组
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      dates.push(dateStr);
    }
    
    // 获取每天的阅读量（兼容新旧数据结构）
    return dates.map(dateStr => {
      let count = 0;
      if (progressData[bookId].dailyRecords && progressData[bookId].dailyRecords[dateStr]) {
        count = progressData[bookId].dailyRecords[dateStr].count || 0;
      } else if (progressData[bookId][dateStr]) {
        // 旧数据结构
        count = progressData[bookId][dateStr] || 0;
      }
      return { date: dateStr, count };
    });
  } catch (error) {
    console.error('获取周阅读数据失败:', error);
    return [];
  }
};

// 获取书籍总阅读量
export const getTotalReadingCount = (bookId) => {
  try {
    const storedData = localStorage.getItem('readingProgress');
    if (!storedData) return 0;
    
    const progressData = JSON.parse(storedData);
    if (!progressData[bookId]) return 0;
    
    // 兼容新结构
    if (progressData[bookId].totalReadCount !== undefined) {
      return progressData[bookId].totalReadCount;
    }
    
    // 旧结构：计算所有日期的阅读量总和
    return Object.entries(progressData[bookId])
      .filter(([key]) => key.match(/^\d{4}-\d{2}-\d{2}$/)) // 只计算日期键
      .reduce((sum, [_, count]) => sum + count, 0);
  } catch (error) {
    console.error('获取总阅读量失败:', error);
    return 0;
  }
};

// === 新增函数 ===

// 更新阅读时长
export const updateReadingDuration = (bookId, duration) => {
  try {
    const dateStr = getDateString();
    const storedData = localStorage.getItem('readingProgress');
    if (!storedData) return false;
    
    const progressData = JSON.parse(storedData);
    if (!progressData[bookId]) return false;
    
    // 确保数据结构正确
    if (!progressData[bookId].dailyRecords) {
      progressData[bookId].dailyRecords = {};
    }
    
    if (!progressData[bookId].dailyRecords[dateStr]) {
      progressData[bookId].dailyRecords[dateStr] = {
        count: 0,
        duration: 0,
        startPosition: progressData[bookId].lastPosition || 0,
        endPosition: progressData[bookId].lastPosition || 0
      };
    }
    
    // 更新阅读时间（增量）
    progressData[bookId].dailyRecords[dateStr].duration += duration;
    
    // 保存回本地存储
    localStorage.setItem('readingProgress', JSON.stringify(progressData));
    return true;
  } catch (error) {
    console.error('更新阅读时长失败:', error);
    return false;
  }
};

// 更新阅读位置
export const updateReadingPosition = (bookId, position) => {
  try {
    const dateStr = getDateString();
    const storedData = localStorage.getItem('readingProgress');
    if (!storedData) return false;
    
    const progressData = JSON.parse(storedData);
    if (!progressData[bookId]) return false;
    
    // 更新最后阅读位置
    progressData[bookId].lastPosition = position;
    
    // 确保日期记录存在
    if (!progressData[bookId].dailyRecords) {
      progressData[bookId].dailyRecords = {};
    }
    
    if (!progressData[bookId].dailyRecords[dateStr]) {
      progressData[bookId].dailyRecords[dateStr] = {
        count: 0,
        duration: 0,
        startPosition: position,
        endPosition: position
      };
    }
    
    // 更新今日结束位置
    progressData[bookId].dailyRecords[dateStr].endPosition = position;
    
    // 保存回本地存储
    localStorage.setItem('readingProgress', JSON.stringify(progressData));
    return true;
  } catch (error) {
    console.error('更新阅读位置失败:', error);
    return false;
  }
};

// 开始新的阅读会话
export const startReadingSession = (bookId, startPosition) => {
  try {
    const dateStr = getDateString();
    const storedData = localStorage.getItem('readingProgress');
    const progressData = storedData ? JSON.parse(storedData) : {};
    
    // 初始化书籍数据（如果不存在）
    if (!progressData[bookId]) {
      progressData[bookId] = {
        title: bookId.split('.txt')[0],
        totalReadCount: 0,
        lastPosition: startPosition,
        startDate: dateStr,
        dailyRecords: {}
      };
    }
    
    // 确保有日期记录
    if (!progressData[bookId].dailyRecords) {
      progressData[bookId].dailyRecords = {};
    }
    
    // 今日记录初始化或更新开始位置
    if (!progressData[bookId].dailyRecords[dateStr]) {
      progressData[bookId].dailyRecords[dateStr] = {
        count: 0,
        duration: 0,
        startPosition: startPosition,
        endPosition: startPosition
      };
    } else {
      // 如果是同一天的新会话，不覆盖原有的startPosition
      // 这里可以根据需要决定是否更新
    }
    
    // 保存回本地存储
    localStorage.setItem('readingProgress', JSON.stringify(progressData));
    return true;
  } catch (error) {
    console.error('开始阅读会话失败:', error);
    return false;
  }
};

// 结束阅读会话
export const endReadingSession = (bookId, endPosition, duration) => {
  try {
    const dateStr = getDateString();
    const storedData = localStorage.getItem('readingProgress');
    if (!storedData) return false;
    
    const progressData = JSON.parse(storedData);
    if (!progressData[bookId]) return false;
    
    // 确保数据结构正确
    if (!progressData[bookId].dailyRecords) {
      progressData[bookId].dailyRecords = {};
    }
    
    if (!progressData[bookId].dailyRecords[dateStr]) {
      progressData[bookId].dailyRecords[dateStr] = {
        count: 0,
        duration: 0,
        startPosition: endPosition,
        endPosition: endPosition
      };
    }
    
    // 更新位置和时长
    progressData[bookId].dailyRecords[dateStr].endPosition = endPosition;
    progressData[bookId].dailyRecords[dateStr].duration += duration;
    
    // 计算本次阅读量
    const startPos = progressData[bookId].dailyRecords[dateStr].startPosition;
    const readInSession = endPosition - startPos;
    
    // 更新当日阅读量 (累计值)
    progressData[bookId].dailyRecords[dateStr].count += Math.max(0, readInSession);
    
    // 更新总阅读量和最后位置
    progressData[bookId].totalReadCount += Math.max(0, readInSession);
    progressData[bookId].lastPosition = endPosition;
    
    // 保存回本地存储
    localStorage.setItem('readingProgress', JSON.stringify(progressData));
    return true;
  } catch (error) {
    console.error('结束阅读会话失败:', error);
    return false;
  }
};

// 获取阅读统计数据
export const getReadingStats = (bookId) => {
  try {
    const storedData = localStorage.getItem('readingProgress');
    if (!storedData) return null;
    
    const progressData = JSON.parse(storedData);
    if (!progressData[bookId]) return null;
    
    // 确保数据结构完整
    const bookData = progressData[bookId];
    if (!bookData.dailyRecords) {
      return {
        title: bookData.title || bookId,
        totalReadCount: getTotalReadingCount(bookId),
        lastPosition: bookData.lastPosition || 0,
        startDate: bookData.startDate || getDateString(),
        averageDaily: 0,
        totalDays: 0,
        streak: 0
      };
    }
    
    // 计算一些统计值
    const dailyRecords = bookData.dailyRecords;
    const recordDays = Object.keys(dailyRecords).sort();
    const totalDays = recordDays.length;
    
    // 计算日均阅读量
    const averageDaily = totalDays > 0 
      ? Math.round(bookData.totalReadCount / totalDays) 
      : 0;
    
    // 计算连续阅读天数
    let streak = 0;
    if (totalDays > 0) {
      const today = getDateString();
      if (dailyRecords[today] && dailyRecords[today].count > 0) {
        streak = 1;
        let checkDate = new Date();
        
        // 向前检查连续天数
        for (let i = 1; i <= 366; i++) { // 最多检查一年
          checkDate.setDate(checkDate.getDate() - 1);
          const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
          
          if (dailyRecords[dateStr] && dailyRecords[dateStr].count > 0) {
            streak++;
          } else {
            break;
          }
        }
      }
    }
    
    return {
      title: bookData.title || bookId,
      totalReadCount: bookData.totalReadCount,
      lastPosition: bookData.lastPosition || 0,
      startDate: bookData.startDate || recordDays[0] || getDateString(),
      averageDaily,
      totalDays,
      streak
    };
  } catch (error) {
    console.error('获取阅读统计失败:', error);
    return null;
  }
};

// 获取书籍的月度阅读数据
export const getMonthReadingData = (bookId) => {
  try {
    const storedData = localStorage.getItem('readingProgress');
    if (!storedData) return [];
    
    const progressData = JSON.parse(storedData);
    if (!progressData[bookId]) return [];
    
    // 确保数据结构完整
    if (!progressData[bookId].dailyRecords) {
      return [];
    }
    
    // 获取当前月份的所有日期
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const result = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayData = progressData[bookId].dailyRecords[dateStr];
      
      result.push({
        date: dateStr,
        count: dayData ? dayData.count : 0,
        duration: dayData ? dayData.duration : 0
      });
    }
    
    return result;
  } catch (error) {
    console.error('获取月度阅读数据失败:', error);
    return [];
  }
};

// 获取所有书籍的阅读统计
export const getAllBooksStats = () => {
  try {
    const storedData = localStorage.getItem('readingProgress');
    if (!storedData) return [];
    
    const progressData = JSON.parse(storedData);
    return Object.keys(progressData).map(bookId => {
      return getReadingStats(bookId);
    }).filter(Boolean);
  } catch (error) {
    console.error('获取所有书籍统计失败:', error);
    return [];
  }
};
