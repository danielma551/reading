// 计算当前段落的进度，针对不同段落有不同的最大值
// totalRead: 已读总句子数
// goal: 总目标句子数
// 返回百分比 (0-100)
const calculateSteppedProgress = (totalRead, goal) => {
  // 如果已经达到或超过目标，显示100%
  if (totalRead >= goal) return 100;
  
  // 如果目标为0，避免除以0的错误
  if (goal === 0) return 0;
  
  // 固定每段为25句
  const fixedSegmentSize = 25;
  
  // 确定当前在第几个段落 (0-3)，每25句为一个段落
  const currentSegment = Math.min(Math.floor(totalRead / fixedSegmentSize), 3);
  
  // 获取当前段落内已读句子数
  const readInCurrentSegment = totalRead % fixedSegmentSize;
  
  // 根据当前段落确定最大百分比
  let maxPercentage;
  switch(currentSegment) {
    case 0: maxPercentage = 25; break;  // 第一段25句：最高25%
    case 1: maxPercentage = 50; break;  // 第二段25句：最高50%
    case 2: maxPercentage = 75; break;  // 第三段25句：最高75%
    case 3: maxPercentage = 100; break; // 第四段25句及以上：最高100%
    default: maxPercentage = 25;        // 默认情况
  }
  
  // 计算当前段落内的进度百分比
  return (readInCurrentSegment / fixedSegmentSize) * maxPercentage;
};

// 获取当前位于哪个段落 (1-4)
const getCurrentSegmentNumber = (totalRead, goal) => {
  // 固定每段为25句
  const fixedSegmentSize = 25;
  return Math.min(Math.floor(totalRead / fixedSegmentSize) + 1, 4);  // 1-4
};

// 获取当前段落内读了多少句
const getReadInCurrentSegment = (totalRead, goal) => {
  // 固定每段为25句
  const fixedSegmentSize = 25;
  return totalRead % fixedSegmentSize;
};

// 获取当前段落大小
const getCurrentSegmentSize = (goal) => {
  // 固定每段为25句
  return 25;
};
