/**
 * 句子分组工具
 * 用于将连续的句子组合在一起
 */

/**
 * 按连续位置分组句子
 * @param {Array} sentences 句子数组
 * @returns {Array} 分组后的句子数组
 */
export function groupConsecutiveSentences(sentences) {
  if (!Array.isArray(sentences) || sentences.length === 0) {
    return [];
  }
  
  // 按照来源和位置排序
  const sortedSentences = [...sentences].sort((a, b) => {
    // 首先按来源排序
    if (a.source !== b.source) {
      return a.source.localeCompare(b.source);
    }
    
    // 如果来源相同，按位置排序（如果位置存在）
    if (a.position !== undefined && b.position !== undefined) {
      return a.position - b.position;
    }
    
    // 如果位置不存在，按日期排序
    return new Date(a.date) - new Date(b.date);
  });
  
  // 将连续的句子分组
  const groups = [];
  let currentGroup = [sortedSentences[0]];
  
  for (let i = 1; i < sortedSentences.length; i++) {
    const current = sortedSentences[i];
    const previous = sortedSentences[i-1];
    
    // 如果来源相同且位置连续（或位置相差不超过5），则属于同一组
    if (current.source === previous.source && 
        current.position !== undefined && 
        previous.position !== undefined &&
        Math.abs(current.position - previous.position) <= 5) {
      currentGroup.push(current);
    } else {
      // 否则开始新的一组
      groups.push(currentGroup);
      currentGroup = [current];
    }
  }
  
  // 添加最后一组
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }
  
  return groups;
}
