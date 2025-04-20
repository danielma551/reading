import { useState, useEffect } from 'react';

export default function Home() {
  const [text, setText] = useState('');
  const [formattedText, setFormattedText] = useState([]);
  const [isReading, setIsReading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [fontSize, setFontSize] = useState(60);
  const [savedTexts, setSavedTexts] = useState([]);
  const [selectedSavedText, setSelectedSavedText] = useState(null);
  const [lastPositions, setLastPositions] = useState({});
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('');
  const [readingGoal, setReadingGoal] = useState(400);
  const [sessionStartIndex, setSessionStartIndex] = useState(0);
  const cardSize = 25; // 每组卡片的数量

  // 背景颜色选项
  const backgroundColors = {
    light: [
      { name: '默认', value: '#f5f5f7' },
      { name: '米色', value: '#f8f5e4' },
      { name: '淡蓝', value: '#f0f5fa' },
      { name: '淡绿', value: '#f2f9f5' },
      { name: '淡粉', value: '#fdf2f4' }
    ],
    dark: [
      { name: '默认', value: '#000000' },
      { name: '深蓝', value: '#1a1c2c' },
      { name: '深棕', value: '#1f1b1c' },
      { name: '深绿', value: '#0f1e1b' },
      { name: '深紫', value: '#1a1725' }
    ]
  };

  useEffect(() => {
    // 检测深色模式
    const darkModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    if (darkModeMedia.matches) {
      setIsDark(true);
    }

    // 设置字体大小，根据屏幕宽度自动调整
    function updateFontSize() {
      const width = window.innerWidth;
      if (width < 480) {
        // 针对较小的手机屏幕
        setFontSize(24);
      } else if (width < 768) {
        // 针对大一点的手机屏幕
        setFontSize(32);
      } else if (width < 1024) {
        setFontSize(48);
      } else {
        setFontSize(60);
      }
    }
    
    updateFontSize();
    window.addEventListener('resize', updateFontSize);
    
    // 从本地存储加载保存的文本和位置信息
    try {
      const savedData = localStorage.getItem('savedTexts');
      const positionsData = localStorage.getItem('lastPositions');
      const savedBackgroundColor = localStorage.getItem('backgroundColor');
      const savedReadingGoal = localStorage.getItem('readingGoal');
      
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setSavedTexts(parsedData);
      }
      
      if (positionsData) {
        const positions = JSON.parse(positionsData);
        setLastPositions(positions);
      }
      
      if (savedBackgroundColor) {
        setBackgroundColor(savedBackgroundColor);
      }

      if (savedReadingGoal) {
        setReadingGoal(parseInt(savedReadingGoal));
      }
      
      // 尝试加载上次阅读的文本
      const lastReadTextIndex = localStorage.getItem('lastReadTextIndex');
      if (lastReadTextIndex !== null && savedData) {
        const textIndex = parseInt(lastReadTextIndex);
        const parsedData = JSON.parse(savedData);
        
        if (parsedData[textIndex]) {
          setSelectedSavedText(textIndex);
          setText(parsedData[textIndex].content);
          formatText(parsedData[textIndex].content);
          
          // 设置阅读位置
          if (positionsData) {
            const positions = JSON.parse(positionsData);
            if (positions[textIndex] !== undefined) {
              setCurrentIndex(positions[textIndex]);
              setSessionStartIndex(positions[textIndex]);
            }
          }
        }
      }
    } catch (error) {
      console.error('加载保存的文本失败:', error);
    }
    
    // 添加移动设备的检测
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // 如果是移动设备，添加触摸事件处理
    if (isMobile) {
      const handleTouchStart = (e) => {
        // 记录触摸起始位置
        window.touchStartX = e.touches[0].clientX;
      };
      
      const handleTouchEnd = (e) => {
        if (!window.touchStartX) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const diff = window.touchStartX - touchEndX;
        
        // 如果滑动距离超过50像素，根据滑动方向翻页
        if (Math.abs(diff) > 50) {
          if (diff > 0) {
            // 向左滑动，下一页
            handleNext();
          } else {
            // 向右滑动，上一页
            handlePrevious();
          }
        }
        
        // 重置起始位置
        window.touchStartX = null;
      };
      
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        window.removeEventListener('resize', updateFontSize);
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
    
    return () => {
      window.removeEventListener('resize', updateFontSize);
    };
  }, []);

  // 保存当前阅读位置
  useEffect(() => {
    if (isReading && selectedSavedText !== null) {
      const newPositions = { ...lastPositions };
      newPositions[selectedSavedText] = currentIndex;
      
      localStorage.setItem('lastPositions', JSON.stringify(newPositions));
      localStorage.setItem('lastReadTextIndex', selectedSavedText.toString());
      
      setLastPositions(newPositions);
    }
  }, [isReading, selectedSavedText, currentIndex, lastPositions]);

  // 保存背景颜色到本地存储
  useEffect(() => {
    if (backgroundColor) {
      localStorage.setItem('backgroundColor', backgroundColor);
    }
  }, [backgroundColor]);

  // 保存阅读目标到本地存储
  useEffect(() => {
    localStorage.setItem('readingGoal', readingGoal.toString());
  }, [readingGoal]);

  // 计算当前阅读会话的进度
  const calculateSessionProgress = () => {
    const sentencesRead = currentIndex - sessionStartIndex + 1;
    return Math.min(Math.max(sentencesRead, 0), readingGoal);
  };
  
  // 检查是否已达成阅读目标
  const isGoalReached = () => {
    return calculateSessionProgress() >= readingGoal;
  };

  // 计算当前会话进度百分比
  const calculateSessionProgressPercentage = () => {
    return (calculateSessionProgress() / readingGoal) * 100;
  };

  // 获取当前段落内的位置 (0-24)，这将用于计算当前段落内的进度
  const getPositionInSegment = () => {
    // 使用当前索引而不是计算的会话进度，确保准确反映当前阅读位置
    return currentIndex % cardSize;
  };

  // 获取当前总段落数
  const getTotalSegments = () => {
    return Math.ceil(readingGoal / cardSize);
  };

  // 获取当前是第几个段落（从1开始）
  const getCurrentSegmentNumber = () => {
    return Math.floor(currentIndex / cardSize) + 1;
  };

  // 获取当前段落已读句子数
  const getSentencesInCurrentSegment = () => {
    return getPositionInSegment() + 1;
  };

  // 获取剩余总段落数
  const getRemainingSegments = () => {
    return getTotalSegments() - getCurrentSegmentNumber() + 1;
  };

  // 计算当前段落在剩余目标中的比例（这是关键计算）
  const calculateSegmentInRemainingPercentage = () => {
    // 获取剩余段落数
    const remainingSegments = getRemainingSegments();
    
    // 如果是最后一段，则直接返回当前段落内的进度
    if (remainingSegments === 1) {
      return (getSentencesInCurrentSegment() / cardSize) * 100;
    }
    
    // 获取当前段落内的进度比例
    const currentSegmentProgress = getSentencesInCurrentSegment() / cardSize;
    
    // 计算这一段占剩余总段落的比例
    return (currentSegmentProgress / remainingSegments) * 100;
  };

  // 根据currentIndex在整个文档中的位置计算总体进度
  const calculateOverallPercentage = () => {
    return ((currentIndex + 1) / Math.min(formattedText.length, readingGoal)) * 100;
  };

  // 开始新的阅读会话
  const startNewSession = () => {
    setSessionStartIndex(currentIndex);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        setText(content);
        formatText(content);
        
        // 保存上传的文本
        saveText(file.name, content);
      };
      reader.readAsText(file);
    }
  };

  // 选择背景颜色
  const selectBackgroundColor = (color) => {
    setBackgroundColor(color);
  };

  // 获取当前应用的背景颜色
  const getCurrentBackgroundColor = () => {
    if (backgroundColor) {
      return backgroundColor;
    }
    return isDark ? backgroundColors.dark[0].value : backgroundColors.light[0].value;
  };

  const formatText = (inputText) => {
    const sentences = inputText
      .split(/([，。？；])/g)
      .reduce((acc, curr, i, arr) => {
        if (i % 2 === 0) {
          const nextItem = arr[i + 1];
          return acc.concat(curr + (nextItem || ''));
        }
        return acc;
      }, [])
      .filter(s => s.trim());
    
    setFormattedText(sentences);
  };

  const saveText = (name, content) => {
    const newSavedTexts = [...savedTexts];
    
    // 检查是否已存在相同名称的文本
    const existingIndex = newSavedTexts.findIndex(item => item.name === name);
    
    if (existingIndex >= 0) {
      // 更新现有文本
      newSavedTexts[existingIndex] = { name, content, date: new Date().toISOString() };
      setSelectedSavedText(existingIndex);
    } else {
      // 添加新文本
      newSavedTexts.push({ name, content, date: new Date().toISOString() });
      setSelectedSavedText(newSavedTexts.length - 1);
    }
    
    setSavedTexts(newSavedTexts);
    
    // 保存到本地存储
    try {
      localStorage.setItem('savedTexts', JSON.stringify(newSavedTexts));
      localStorage.setItem('lastReadTextIndex', selectedSavedText !== null ? selectedSavedText.toString() : '0');
    } catch (error) {
      console.error('保存文本失败:', error);
    }
  };

  const loadSavedText = (index) => {
    if (savedTexts[index]) {
      setSelectedSavedText(index);
      setText(savedTexts[index].content);
      formatText(savedTexts[index].content);
      
      // 恢复上次阅读位置
      if (lastPositions[index] !== undefined) {
        setCurrentIndex(lastPositions[index]);
      } else {
        setCurrentIndex(0);
      }
      
      // 记录当前选择的文本
      localStorage.setItem('lastReadTextIndex', index.toString());
    }
  };

  const deleteSavedText = (e, index) => {
    e.stopPropagation(); // 阻止点击事件冒泡
    
    const newSavedTexts = [...savedTexts];
    newSavedTexts.splice(index, 1);
    setSavedTexts(newSavedTexts);
    
    // 删除该文本的位置记录
    const newPositions = { ...lastPositions };
    delete newPositions[index];
    
    // 调整其他文本的位置索引
    const adjustedPositions = {};
    Object.keys(newPositions).forEach(key => {
      const keyNum = parseInt(key);
      if (keyNum > index) {
        adjustedPositions[keyNum - 1] = newPositions[keyNum];
      } else {
        adjustedPositions[keyNum] = newPositions[keyNum];
      }
    });
    
    setLastPositions(adjustedPositions);
    localStorage.setItem('lastPositions', JSON.stringify(adjustedPositions));
    
    // 如果删除的是当前选中的文本，清空选择
    if (selectedSavedText === index) {
      setSelectedSavedText(null);
      setText('');
      setFormattedText([]);
      localStorage.removeItem('lastReadTextIndex');
    } else if (selectedSavedText > index) {
      // 如果删除的是当前选中文本之前的文本，调整选中索引
      setSelectedSavedText(selectedSavedText - 1);
      localStorage.setItem('lastReadTextIndex', (selectedSavedText - 1).toString());
    }
    
    // 更新本地存储
    localStorage.setItem('savedTexts', JSON.stringify(newSavedTexts));
  };

  const toggleReadingMode = () => {
    if (!isReading) {
      // 当开始阅读时，设置当前位置为会话起点
      setSessionStartIndex(currentIndex);
    }
    setIsReading(!isReading);
  };

  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(formattedText.length - 1, prev + 1));
  };

  const toggleDarkMode = () => {
    setIsDark(!isDark);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // 添加双击切换设置面板功能
  const handleContentDoubleClick = () => {
    toggleMenu();
  };

  // 苹果风格样式 - 添加移动端响应式样式
  const styles = {
    container: {
      height: '100vh',
      width: '100vw',
      backgroundColor: getCurrentBackgroundColor(),
      color: isDark ? '#f5f5f7' : '#1d1d1f',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      overflow: 'hidden',
      position: 'relative',
      transition: 'background-color 0.3s ease, color 0.3s ease',
      WebkitTapHighlightColor: 'transparent', // 防止移动端点击出现蓝色高亮
    },
    header: {
      height: '44px',
      backgroundColor: isDark ? 'rgba(30, 30, 30, 0.8)' : 'rgba(245, 245, 247, 0.8)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)', // 为iOS Safari添加支持
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0 16px',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      boxShadow: isDark ? '0 1px 0 rgba(255, 255, 255, 0.05)' : '0 1px 0 rgba(0, 0, 0, 0.05)',
      transition: 'background-color 0.3s ease'
    },
    headerButton: {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: isDark ? '#0a84ff' : '#06c',
      padding: '8px',
      fontSize: '15px',
      fontWeight: '500',
      transition: 'opacity 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      touchAction: 'manipulation', // 优化触摸事件
    },
    headerTitle: {
      fontSize: '17px',
      fontWeight: '600',
      color: isDark ? '#f5f5f7' : '#1d1d1f',
      maxWidth: '60%', // 限制在移动设备上的宽度
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    contentArea: {
      position: 'absolute',
      top: '44px',
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      transition: 'opacity 0.3s ease',
      touchAction: 'pan-x pan-y', // 允许滑动但不影响点击
    },
    textContent: {
      fontSize: `${fontSize}px`,
      textAlign: 'center',
      maxWidth: '90%',
      fontWeight: '300',
      lineHeight: '1.4',
      letterSpacing: '0.01em',
      transition: 'all 0.3s ease',
      userSelect: 'none', // 防止文本选择影响滑动
    },
    clickArea: {
      position: 'absolute',
      top: '44px',
      bottom: 0,
      width: '50%',
      cursor: 'pointer',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent'
    },
    progressBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      height: '4px',
      backgroundColor: isDark ? '#0a84ff' : '#06c',
      transition: 'width 0.3s ease',
      borderRadius: '2px',
      opacity: '0.9'
    },
    menu: {
      position: 'absolute',
      top: '44px',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      zIndex: 9,
      display: isMenuOpen ? 'flex' : 'none',
      flexDirection: 'column',
      padding: '20px',
      transition: 'all 0.3s ease',
      overflowY: 'auto'
    },
    menuTitle: {
      fontSize: '22px',
      fontWeight: '600',
      marginBottom: '20px',
      color: isDark ? '#f5f5f7' : '#1d1d1f',
      textAlign: 'center'
    },
    // 苹果风格的库页面样式
    libraryContainer: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: getCurrentBackgroundColor(),
      color: isDark ? '#f5f5f7' : '#1d1d1f',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      transition: 'background-color 0.3s ease, color 0.3s ease'
    },
    libraryHeader: {
      height: '44px',
      backgroundColor: isDark ? 'rgba(30, 30, 30, 0.8)' : 'rgba(245, 245, 247, 0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      boxShadow: isDark ? '0 1px 0 rgba(255, 255, 255, 0.05)' : '0 1px 0 rgba(0, 0, 0, 0.05)',
      position: 'sticky',
      top: 0,
      zIndex: 10
    },
    libraryTitle: {
      fontSize: '17px',
      fontWeight: '600',
      color: isDark ? '#f5f5f7' : '#1d1d1f'
    },
    libraryContent: {
      flex: 1,
      padding: '20px',
      maxWidth: '700px',
      margin: '0 auto',
      width: '100%'
    },
    card: {
      backgroundColor: isDark ? '#1c1c1e' : '#fff',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: isDark 
        ? '0 4px 16px rgba(0, 0, 0, 0.3)' 
        : '0 4px 16px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.05)',
      marginBottom: '24px',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      maxWidth: '100%'
    },
    cardTitle: {
      fontSize: '22px',
      fontWeight: '600',
      marginBottom: '16px',
      color: isDark ? '#f5f5f7' : '#1d1d1f'
    },
    dropZone: {
      position: 'relative',
      border: `2px dashed ${isDark ? '#424245' : '#d2d2d7'}`,
      backgroundColor: isDark ? '#2c2c2e' : '#f5f5f7',
      borderRadius: '12px',
      padding: '32px 24px',
      textAlign: 'center',
      transition: 'all 0.2s ease',
      marginBottom: '24px'
    },
    dropZoneText: {
      fontSize: '15px',
      color: isDark ? '#86868b' : '#86868b',
      marginBottom: '8px'
    },
    dropZoneSubtext: {
      fontSize: '13px',
      color: isDark ? '#636366' : '#a1a1a6'
    },
    listSection: {
      marginTop: '32px'
    },
    listTitle: {
      fontSize: '17px',
      fontWeight: '600',
      marginBottom: '12px',
      color: isDark ? '#f5f5f7' : '#1d1d1f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    listContainer: {
      backgroundColor: isDark ? '#2c2c2e' : '#fff',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: isDark 
        ? '0 2px 8px rgba(0, 0, 0, 0.2)' 
        : '0 2px 8px rgba(0, 0, 0, 0.05)'
    },
    listItem: {
      padding: '13px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: `1px solid ${isDark ? '#38383a' : '#e5e5ea'}`,
      backgroundColor: 'transparent',
      transition: 'background-color 0.2s ease',
      cursor: 'pointer'
    },
    listItemActive: {
      backgroundColor: isDark ? '#38383a' : '#f2f2f7'
    },
    listItemTitle: {
      fontSize: '16px',
      color: isDark ? '#f5f5f7' : '#1d1d1f',
      flex: 1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    listItemSubtitle: {
      fontSize: '13px',
      color: isDark ? '#98989d' : '#8e8e93',
      marginTop: '4px'
    },
    button: {
      backgroundColor: isDark ? '#0a84ff' : '#06c',
      color: 'white',
      fontWeight: '600',
      fontSize: '16px',
      border: 'none',
      borderRadius: '12px',
      padding: '12px 24px',
      width: '100%',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      marginTop: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    buttonHover: {
      backgroundColor: isDark ? '#0071e3' : '#0051a8'
    },
    iconButton: {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: isDark ? '#0a84ff' : '#06c',
      padding: '8px',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'opacity 0.2s ease'
    },
    modeButton: {
      border: 'none',
      background: isDark ? '#2c2c2e' : '#f2f2f7',
      padding: '4px 12px',
      borderRadius: '16px',
      fontSize: '12px',
      color: isDark ? '#f5f5f7' : '#1d1d1f',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease'
    },
    colorOption: {
      width: '30px',
      height: '30px',
      borderRadius: '50%',
      margin: '0 8px',
      cursor: 'pointer',
      border: '2px solid transparent',
      transition: 'transform 0.2s ease, border-color 0.2s ease',
    },
    colorOptionActive: {
      transform: 'scale(1.1)',
      border: '2px solid #0a84ff',
    },
    colorPickerContainer: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '24px',
    },
    colorPickerLabel: {
      fontSize: '15px',
      marginBottom: '12px',
      color: isDark ? '#98989d' : '#8e8e93',
      textAlign: 'center',
    },
    goalProgressContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      marginBottom: '20px',
      padding: '10px',
      backgroundColor: isDark ? 'rgba(60, 60, 60, 0.5)' : 'rgba(240, 240, 240, 0.5)',
      borderRadius: '12px',
      width: '100%',
      maxWidth: '450px', // 适应移动端宽度
    },
    goalProgressTitle: {
      fontSize: '15px',
      marginBottom: '8px',
      color: isDark ? '#f5f5f7' : '#1d1d1f',
      fontWeight: '500',
    },
    goalProgressBar: {
      width: '100%',
      height: '8px',
      backgroundColor: isDark ? '#38383a' : '#e5e5ea',
      borderRadius: '4px',
      overflow: 'hidden',
      marginBottom: '8px',
    },
    goalProgressBarFill: {
      height: '100%',
      backgroundColor: isGoalReached() ? '#30d158' : (isDark ? '#0a84ff' : '#06c'),
      borderRadius: '4px',
      transition: 'width 0.3s ease',
    },
    goalProgressText: {
      fontSize: '13px',
      color: isDark ? '#98989d' : '#8e8e93',
    },
    goalProgressCompleted: {
      color: '#30d158',
      fontWeight: '600',
    },
    // 移动优化的进度指示器
    progressIndicator: {
      position: 'absolute',
      top: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '85%', // 移动端稍微宽一点
      maxWidth: '1000px',
      backgroundColor: isDark ? 'rgba(30, 30, 30, 0.7)' : 'rgba(245, 245, 247, 0.7)',
      borderRadius: '16px',
      padding: '8px 12px', // 略微缩小内边距
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      backdropFilter: 'blur(5px)',
      WebkitBackdropFilter: 'blur(5px)', // 为iOS Safari添加支持
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      zIndex: 3
    },
    
    // 移动设备提示信息
    mobileHint: {
      position: 'absolute',
      bottom: '20px',
      left: '0',
      right: '0',
      textAlign: 'center',
      color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
      fontSize: '12px',
      padding: '8px',
      pointerEvents: 'none', // 不干扰交互
      opacity: 0.8,
      animation: 'fadeOut 3s forwards 2s',
      zIndex: 2,
    },
  };

  // 阅读时的进度条宽度
  const progressWidth = formattedText.length > 0 
    ? `${((currentIndex + 1) / formattedText.length) * 100}%` 
    : '0%';

  // 阅读目标进度条宽度
  const goalProgressWidth = `${calculateSessionProgressPercentage()}%`;

  // 段落进度条宽度 - 基于剩余段落的计算方式
  const segmentProgressWidth = `${calculateSegmentInRemainingPercentage()}%`;

  if (isReading && formattedText.length > 0) {
    // 苹果风格的阅读模式
    return (
      <div style={styles.container}>
        {/* 顶部导航栏 */}
        <div style={styles.header}>
          <button 
            onClick={toggleReadingMode}
            style={styles.headerButton}
          >
            完成
          </button>
          <div style={styles.headerTitle}>
            {selectedSavedText !== null && savedTexts[selectedSavedText]
              ? savedTexts[selectedSavedText].name 
              : '阅读中'}
          </div>
          <button 
            onClick={toggleMenu}
            style={styles.headerButton}
          >
            {isMenuOpen ? '关闭' : '设置'}
          </button>
        </div>

        {/* 阅读设置菜单 */}
        <div style={styles.menu}>
          <div style={styles.menuTitle}>阅读设置</div>
          
          <div style={{marginBottom: '20px', textAlign: 'center'}}>
            <button 
              onClick={toggleDarkMode} 
              style={styles.modeButton}
            >
              切换到{isDark ? '浅色' : '深色'}模式
            </button>
          </div>
          
          {/* 阅读目标设置 */}
          <div style={{marginBottom: '24px'}}>
            <div style={styles.colorPickerLabel}>阅读目标（句子数）</div>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px'
            }}>
              <button 
                onClick={() => setReadingGoal(prev => Math.max(50, prev - 50))}
                style={{
                  ...styles.iconButton,
                  fontSize: '16px'
                }}
              >
                -
              </button>
              <div style={{
                fontSize: '17px',
                fontWeight: '600',
                color: isDark ? '#f5f5f7' : '#1d1d1f',
                minWidth: '60px',
                textAlign: 'center'
              }}>
                {readingGoal}
              </div>
              <button 
                onClick={() => setReadingGoal(prev => prev + 50)}
                style={{
                  ...styles.iconButton,
                  fontSize: '16px'
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* 当前会话阅读进度 */}
          <div style={styles.goalProgressContainer}>
            <div style={styles.goalProgressTitle}>
              当前阅读进度
            </div>
            <div style={styles.goalProgressBar}>
              <div 
                style={{
                  ...styles.goalProgressBarFill,
                  width: goalProgressWidth
                }}
              />
            </div>
            <div style={{
              ...styles.goalProgressText,
              ...(isGoalReached() ? styles.goalProgressCompleted : {})
            }}>
              {calculateSessionProgress()} / {readingGoal} 句
              {isGoalReached() ? ' · 目标达成！' : ''}
            </div>
            
            {isGoalReached() && (
              <button
                onClick={startNewSession}
                style={{
                  ...styles.modeButton,
                  marginTop: '12px',
                  backgroundColor: isDark ? '#2c2c2e' : '#e5e5ea'
                }}
              >
                开始新会话
              </button>
            )}
          </div>
          
          {/* 段落进度 */}
          <div style={styles.goalProgressContainer}>
            <div style={styles.goalProgressTitle}>
              段落进度 (每{cardSize}句)
            </div>
            <div style={styles.goalProgressBar}>
              <div 
                style={{
                  ...styles.goalProgressBarFill,
                  backgroundColor: isDark ? '#ff9f0a' : '#ff9500',
                  width: segmentProgressWidth
                }}
              />
            </div>
            <div style={styles.goalProgressText}>
              {getSentencesInCurrentSegment()}/{cardSize} 句 · 
              第{getCurrentSegmentNumber()}/{getTotalSegments()}段
            </div>
            
            <div style={{
              fontSize: '12px',
              color: isDark ? '#86868b' : '#98989d',
              marginTop: '4px',
              textAlign: 'center'
            }}>
              剩余: {getRemainingSegments()}段 · 
              当前段落占比: {Math.round(calculateSegmentInRemainingPercentage())}%
            </div>
          </div>
          
          {/* 背景颜色选择器 */}
          <div style={{marginBottom: '24px'}}>
            <div style={styles.colorPickerLabel}>背景颜色</div>
            <div style={styles.colorPickerContainer}>
              {(isDark ? backgroundColors.dark : backgroundColors.light).map((color, index) => (
                <div
                  key={index}
                  title={color.name}
                  onClick={() => selectBackgroundColor(color.value)}
                  style={{
                    ...styles.colorOption,
                    backgroundColor: color.value,
                    ...(getCurrentBackgroundColor() === color.value ? styles.colorOptionActive : {})
                  }}
                />
              ))}
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <div style={{
              fontSize: '15px',
              marginBottom: '12px',
              color: isDark ? '#98989d' : '#8e8e93'
            }}>字体大小</div>
            
            <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
              <button 
                onClick={() => setFontSize(prev => Math.max(16, prev - 4))}
                style={styles.iconButton}
              >
                A-
              </button>
              
              <div style={{
                fontSize: '17px',
                color: isDark ? '#f5f5f7' : '#1d1d1f'
              }}>
                {fontSize}px
              </div>
              
              <button 
                onClick={() => setFontSize(prev => Math.min(80, prev + 4))}
                style={styles.iconButton}
              >
                A+
              </button>
            </div>
          </div>
        </div>

        {/* 主内容区 */}
        <div 
          style={styles.contentArea}
          onDoubleClick={handleContentDoubleClick}
        >
          {/* 顶部永久显示的页面进度指示器 */}
          <div style={styles.progressIndicator}>
            <div style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px'
            }}>
              <div style={{
                fontSize: '12px', // 移动端字体略小
                fontWeight: '500',
                color: isDark ? '#f5f5f7' : '#1d1d1f',
              }}>
                第{getCurrentSegmentNumber()}/{getTotalSegments()}段 ({getSentencesInCurrentSegment()}/{cardSize}句)
              </div>
              <div style={{
                fontSize: '12px', // 移动端字体略小
                color: isDark ? '#98989d' : '#8e8e93',
              }}>
                总进度: {Math.round(calculateOverallPercentage())}%
              </div>
            </div>
            <div style={{
              width: '100%',
              height: '6px', // 移动端稍微薄一点
              backgroundColor: isDark ? '#38383a' : '#e5e5ea',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: segmentProgressWidth,
                backgroundColor: '#ff9500',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
          
          <div style={styles.textContent}>
            {formattedText[currentIndex]}
          </div>
          
          {/* 移动设备操作提示，3秒后淡出 */}
          <div style={styles.mobileHint}>
            向左/右滑动切换句子 · 双击屏幕打开设置
          </div>
        </div>

        {/* 进度条 */}
        <div 
          style={{
            ...styles.progressBar,
            width: progressWidth
          }}
        />

        {/* 左右点击区域 */}
        <div
          onClick={handlePrevious}
          style={{
            ...styles.clickArea,
            left: 0
          }}
        />
        <div
          onClick={handleNext}
          style={{
            ...styles.clickArea,
            right: 0
          }}
        />
      </div>
    );
  }

  // 苹果风格的库页面 - 针对移动设备优化
  return (
    <div style={styles.libraryContainer}>
      <div style={styles.libraryHeader}>
        <div style={styles.libraryTitle}>阅读器</div>
      </div>
      
      <div style={{
        ...styles.libraryContent,
        padding: '16px', // 移动端padding更小
      }}>
        <div style={styles.card}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <div style={styles.cardTitle}>文库</div>
            <div style={{display: 'flex', gap: '8px'}}>
              <button 
                onClick={toggleDarkMode}
                style={styles.modeButton}
              >
                {isDark ? '浅色' : '深色'}
              </button>
            </div>
          </div>

          {/* 库页面背景颜色选择器 */}
          <div style={{marginBottom: '24px'}}>
            <div style={styles.colorPickerLabel}>背景颜色</div>
            <div style={styles.colorPickerContainer}>
              {(isDark ? backgroundColors.dark : backgroundColors.light).map((color, index) => (
                <div
                  key={index}
                  title={color.name}
                  onClick={() => selectBackgroundColor(color.value)}
                  style={{
                    ...styles.colorOption,
                    backgroundColor: color.value,
                    ...(getCurrentBackgroundColor() === color.value ? styles.colorOptionActive : {})
                  }}
                />
              ))}
            </div>
          </div>
          
          <div style={styles.dropZone}>
            <div style={styles.dropZoneText}>添加新文件</div>
            <div style={styles.dropZoneSubtext}>拖放文件到此处，或点击选择</div>
            <input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer'
              }}
            />
          </div>
          
          {savedTexts.length > 0 && (
            <div style={styles.listSection}>
              <div style={styles.listTitle}>
                <span>我的文档</span>
                <span style={{fontSize: '13px', color: isDark ? '#8e8e93' : '#8e8e93'}}>
                  {savedTexts.length}个文件
                </span>
              </div>
              
              <div style={styles.listContainer}>
                {savedTexts.map((item, index) => {
                  const position = lastPositions[index];
                  const hasPosition = position !== undefined;
                  const isSelected = selectedSavedText === index;
                  const date = new Date(item.date);
                  const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
                  
                  return (
                    <div 
                      key={index}
                      onClick={() => loadSavedText(index)}
                      style={{
                        ...styles.listItem,
                        ...(isSelected ? styles.listItemActive : {})
                      }}
                    >
                      <div style={{flex: 1}}>
                        <div style={styles.listItemTitle}>
                          {item.name}
                        </div>
                        <div style={styles.listItemSubtitle}>
                          {formattedDate}
                          {hasPosition && formattedText.length > 0 && (
                            <span style={{marginLeft: '8px'}}>
                              · 已读{Math.round(((position + 1) / formattedText.length) * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => deleteSavedText(e, index)}
                        style={styles.iconButton}
                      >
                        删除
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {formattedText.length > 0 && (
            <button
              onClick={toggleReadingMode}
              style={styles.button}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styles.buttonHover.backgroundColor}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = styles.button.backgroundColor}
            >
              开始阅读
            </button>
          )}
          
          <style jsx global>{`
            @keyframes fadeOut {
              from { opacity: 0.8; }
              to { opacity: 0; }
            }
            
            /* 移动设备适配样式 */
            @media (max-width: 480px) {
              body {
                overscroll-behavior: none; /* 防止iOS上的橡皮筋效果 */
              }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
} 