import { useState, useEffect } from 'react';

export default function Home() {
  // 添加客户端渲染检测状态
  const [isClient, setIsClient] = useState(false);
  const [text, setText] = useState('');
  const [formattedText, setFormattedText] = useState([]);
  const [isReading, setIsReading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [fontSize, setFontSize] = useState(20); // 默认字体大小
  const [savedTexts, setSavedTexts] = useState([]);
  const [selectedSavedText, setSelectedSavedText] = useState(null);
  const [lastPositions, setLastPositions] = useState({});
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('');
  const [readingGoal, setReadingGoal] = useState(400);
  const [sessionStartIndex, setSessionStartIndex] = useState(0);
  const [selectedFont, setSelectedFont] = useState('cangerJinKai'); // 默认使用仓耳今楷字体
  // 新增：自定义字体状态
  const [customFonts, setCustomFonts] = useState([]);
  const cardSize = 25; // 每组卡片的数量
  // 新增：加载状态
  const [isLoading, setIsLoading] = useState(false);

  // 初始化客户端检测
  useEffect(() => {
    setIsClient(true);
    
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
      const savedFont = localStorage.getItem('selectedFont');
      // 新增：加载自定义字体
      const savedCustomFonts = localStorage.getItem('customFonts');
      
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
      
      if (savedFont) {
        setSelectedFont(savedFont);
      }
      
      // 新增：加载并应用自定义字体
      if (savedCustomFonts) {
        const parsedFonts = JSON.parse(savedCustomFonts);
        setCustomFonts(parsedFonts);
        
        // 为每个保存的字体创建一个 @font-face
        parsedFonts.forEach(font => {
          if (font.fontData) {
            const style = document.createElement('style');
            style.textContent = `
              @font-face {
                font-family: '${font.name}';
                src: url(${font.fontData}) format('${getFontFormat(font.type)}');
                font-weight: normal;
                font-style: normal;
              }
            `;
            document.head.appendChild(style);
          }
        });
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

  // 根据文件类型获取字体格式
  const getFontFormat = (fileType) => {
    const formats = {
      'font/ttf': 'truetype',
      'font/otf': 'opentype',
      'font/woff': 'woff',
      'font/woff2': 'woff2',
      'application/font-woff': 'woff',
      'application/font-woff2': 'woff2',
      'application/octet-stream': 'truetype', // 常见的ttf文件类型
    };
    
    return formats[fileType] || 'truetype'; // 默认使用 truetype
  };

  // 处理字体文件上传
  const handleFontUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 支持的字体格式
    const supportedTypes = [
      'font/ttf', 'font/otf', 'font/woff', 'font/woff2',
      'application/font-woff', 'application/font-woff2',
      'application/octet-stream' // 某些ttf文件可能被识别为这种类型
    ];

    // 检查文件类型
    const isSupported = supportedTypes.includes(file.type) || 
                        file.name.match(/\.(ttf|otf|woff|woff2)$/i);
    
    if (!isSupported) {
      alert('不支持的字体格式。请上传 .ttf, .otf, .woff 或 .woff2 文件。');
      return;
    }

    // 获取字体名称（移除扩展名）
    let fontName = file.name.replace(/\.[^/.]+$/, "");
    
    // 可选：提示用户输入字体名称
    const customName = window.prompt('请为您的字体命名（该名称将显示在字体列表中）：', fontName);
    if (customName) {
      fontName = customName;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      // 创建新的字体对象
      const newFont = {
        id: `custom-${Date.now()}`,
        name: fontName,
        value: `'${fontName}'`,
        type: file.type,
        fontData: e.target.result
      };

      // 添加到自定义字体列表
      const updatedFonts = [...customFonts, newFont];
      setCustomFonts(updatedFonts);
      
      // 保存到本地存储
      localStorage.setItem('customFonts', JSON.stringify(updatedFonts));

      // 创建 @font-face 规则
      const style = document.createElement('style');
      style.textContent = `
        @font-face {
          font-family: '${fontName}';
          src: url(${e.target.result}) format('${getFontFormat(file.type)}');
          font-weight: normal;
          font-style: normal;
        }
      `;
      document.head.appendChild(style);

      // 自动选择新字体
      setSelectedFont(newFont.id);
      localStorage.setItem('selectedFont', newFont.id);

      alert('字体导入成功！已自动切换到您的新字体。');
    };
    
    reader.readAsDataURL(file);
  };

  // 删除自定义字体
  const deleteCustomFont = (fontId) => {
    if (!isClient) return;
    
    // 如果正在使用要删除的字体，则切换到系统默认字体
    if (selectedFont === fontId) {
      setSelectedFont('cangerJinKai');
      localStorage.setItem('selectedFont', 'cangerJinKai');
    }
    
    // 从自定义字体列表中移除
    const updatedCustomFonts = customFonts.filter(font => font.id !== fontId);
    setCustomFonts(updatedCustomFonts);
    localStorage.setItem('customFonts', JSON.stringify(updatedCustomFonts));
  };

  // 只有在客户端才加载字体和背景颜色选项
  const fontOptions = isClient ? [
    { id: 'cangerJinKai', name: '仓耳今楷', value: 'CangErJinKai, PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif' },
    { id: 'serif', name: '衬线字体', value: 'Georgia, "Times New Roman", serif' },
    { id: 'sans', name: '无衬线字体', value: 'Arial, Helvetica, sans-serif' },
    { id: 'mono', name: '等宽字体', value: '"SF Mono", Menlo, Monaco, Consolas, monospace' },
    { id: 'rounded', name: '圆润字体', value: '"SF Pro Rounded", "Hiragino Sans GB", "PingFang SC", sans-serif' },
    ...customFonts // 合并自定义字体
  ] : [];

  // 获取当前所选字体
  const getCurrentFont = () => {
    if (!isClient) return '';
    
    // 先在系统字体中查找
    const systemFont = fontOptions.find(font => font.id === selectedFont);
    if (systemFont) return systemFont.value;
    
    // 如果是自定义字体，返回字体名称
    const customFont = customFonts.find(font => font.id === selectedFont);
    if (customFont) return customFont.value;
    
    // 默认返回系统字体
    return fontOptions[0]?.value || '';
  };

  // 选择字体函数
  const selectFont = (fontId) => {
    if (!isClient) return;
    setSelectedFont(fontId);
    localStorage.setItem('selectedFont', fontId);
  };

  // 背景颜色选项
  const backgroundColors = isClient ? {
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
  } : { light: [], dark: [] };

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
      // 设置加载状态
      setIsLoading(true);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        setText(content);
        
        // 使用setTimeout避免UI阻塞
        setTimeout(() => {
          // 保存上传的文本
          saveText(file.name, content);
          
          // formatText会在内部管理加载状态
          formatText(content);
        }, 50);
      };
      
      reader.onerror = () => {
        setIsLoading(false);
        alert('读取文件失败，请重试。');
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
    if (!isClient) return '#f5f5f7'; // 服务器端渲染时的默认值
    if (backgroundColor) {
      return backgroundColor;
    }
    return isDark ? backgroundColors.dark[0]?.value || '#000000' : backgroundColors.light[0]?.value || '#f5f5f7';
  };

  const formatText = (inputText) => {
    if (!isClient || !inputText) return; // 服务器端渲染时不执行
    
    // 设置加载状态
    setIsLoading(true);
    
    // 检查文本是否超大（可以调整这个阈值）
    const isHugeText = inputText.length > 500000; // 约50万字符视为超大文本
    
    if (isHugeText) {
      // 对于超大文本，使用批处理
      console.log(`处理超大文本，长度：${inputText.length}字符`);
      
      // 步骤1：将文本分成较小的块
      const chunkSize = 100000; // 每10万字符一个块
      const chunks = [];
      for (let i = 0; i < inputText.length; i += chunkSize) {
        chunks.push(inputText.slice(i, i + chunkSize));
      }
      
      // 步骤2：逐块处理
      let resultSentences = [];
      let processedChunks = 0;
      
      function processNextChunk() {
        if (processedChunks >= chunks.length) {
          // 所有块处理完毕
          setFormattedText(resultSentences);
          setIsLoading(false);
          return;
        }
        
        setTimeout(() => {
          const chunk = chunks[processedChunks];
          
          // 处理当前块
          const chunkSentences = chunk
            .split(/([，。？；])/g)
            .reduce((acc, curr, i, arr) => {
              if (i % 2 === 0) {
                const nextItem = arr[i + 1];
                return acc.concat(curr + (nextItem || ''));
              }
              return acc;
            }, [])
            .filter(s => s.trim());
          
          // 合并结果
          resultSentences = resultSentences.concat(chunkSentences);
          
          // 更新进度
          const progress = Math.round(((processedChunks + 1) / chunks.length) * 100);
          console.log(`文本处理进度：${progress}%`);
          
          // 处理下一块
          processedChunks++;
          processNextChunk();
        }, 0); // 使用零延迟也可以让UI有机会更新
      }
      
      // 开始处理
      processNextChunk();
    } else {
      // 对于普通大小的文本，使用setTimeout避免UI阻塞
      setTimeout(() => {
        try {
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
        } catch (error) {
          console.error('文本格式化失败:', error);
        } finally {
          // 完成后关闭加载状态
          setIsLoading(false);
        }
      }, 10);
    }
  };

  const saveText = (name, content) => {
    try {
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
      localStorage.setItem('savedTexts', JSON.stringify(newSavedTexts));
      localStorage.setItem('lastReadTextIndex', selectedSavedText !== null ? selectedSavedText.toString() : '0');
      
      return true;
    } catch (error) {
      console.error('保存文本失败:', error);
      // 如果保存失败，确保关闭加载状态
      setIsLoading(false);
      return false;
    }
  };

  const loadSavedText = (index) => {
    if (selectedSavedText === index) return; // 避免重复加载同一文本
    
    if (savedTexts[index]) {
      // 设置加载状态
      setIsLoading(true);
      
      // 首先更新UI以指示正在加载
      setSelectedSavedText(index);
      
      // 延迟处理文本，让UI有机会更新
      setTimeout(() => {
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
      }, 50);
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
      // 开始阅读前询问今日目标句子数
      const input = window.prompt('请输入今日计划阅读句子数：', readingGoal);
      if (input !== null) {
        const goal = parseInt(input, 10);
        if (!isNaN(goal) && goal > 0) {
          setReadingGoal(goal);
        }
      }
      // 设置当前会话起点
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

  // 新增：导出数据功能
  const exportData = () => {
    try {
      // 收集所有需要保存的数据
      const dataToExport = {
        savedTexts: savedTexts,
        lastPositions: lastPositions,
        backgroundColor: backgroundColor,
        readingGoal: readingGoal,
        selectedFont: selectedFont,
        lastReadTextIndex: selectedSavedText,
        customFonts: customFonts
      };
      
      // 转换为JSON字符串
      const jsonData = JSON.stringify(dataToExport);
      
      // 创建一个Blob对象
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // 创建一个下载链接
      const a = document.createElement('a');
      a.href = url;
      a.download = `阅读器数据备份_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      
      // 清理
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      
      alert('数据导出成功！您可以在其他设备上导入此文件。');
    } catch (error) {
      console.error('导出数据失败:', error);
      alert('导出数据失败，请重试。');
    }
  };
  
  // 新增：导入数据功能
  const importData = (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          
          // 导入保存的文本
          if (importedData.savedTexts) {
            setSavedTexts(importedData.savedTexts);
            localStorage.setItem('savedTexts', JSON.stringify(importedData.savedTexts));
          }
          
          // 导入位置信息
          if (importedData.lastPositions) {
            setLastPositions(importedData.lastPositions);
            localStorage.setItem('lastPositions', JSON.stringify(importedData.lastPositions));
          }
          
          // 导入背景颜色
          if (importedData.backgroundColor) {
            setBackgroundColor(importedData.backgroundColor);
            localStorage.setItem('backgroundColor', importedData.backgroundColor);
          }
          
          // 导入阅读目标
          if (importedData.readingGoal) {
            setReadingGoal(importedData.readingGoal);
            localStorage.setItem('readingGoal', importedData.readingGoal.toString());
          }
          
          // 导入自定义字体
          if (importedData.customFonts && importedData.customFonts.length > 0) {
            setCustomFonts(importedData.customFonts);
            localStorage.setItem('customFonts', JSON.stringify(importedData.customFonts));
            
            // 为每个导入的字体创建一个 @font-face
            importedData.customFonts.forEach(font => {
              if (font.fontData) {
                const style = document.createElement('style');
                style.textContent = `
                  @font-face {
                    font-family: '${font.name}';
                    src: url(${font.fontData}) format('${getFontFormat(font.type)}');
                    font-weight: normal;
                    font-style: normal;
                  }
                `;
                document.head.appendChild(style);
              }
            });
          }
          
          // 导入字体设置
          if (importedData.selectedFont) {
            setSelectedFont(importedData.selectedFont);
            localStorage.setItem('selectedFont', importedData.selectedFont);
          }
          
          // 导入上次阅读的文本索引
          if (importedData.lastReadTextIndex !== null && importedData.lastReadTextIndex !== undefined) {
            localStorage.setItem('lastReadTextIndex', importedData.lastReadTextIndex.toString());
            
            // 如果有上次阅读的文本，加载它
            if (importedData.savedTexts && importedData.savedTexts[importedData.lastReadTextIndex]) {
              setSelectedSavedText(importedData.lastReadTextIndex);
              setText(importedData.savedTexts[importedData.lastReadTextIndex].content);
              formatText(importedData.savedTexts[importedData.lastReadTextIndex].content);
              
              // 设置上次的阅读位置
              if (importedData.lastPositions && importedData.lastPositions[importedData.lastReadTextIndex] !== undefined) {
                setCurrentIndex(importedData.lastPositions[importedData.lastReadTextIndex]);
                setSessionStartIndex(importedData.lastPositions[importedData.lastReadTextIndex]);
              }
            }
          }
          
          alert('数据导入成功！');
        } catch (parseError) {
          console.error('解析导入数据失败:', parseError);
          alert('导入失败：文件格式不正确。');
        }
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('导入数据失败:', error);
      alert('导入数据失败，请重试。');
    }
  };

  // 如果在服务器端或者尚未完成水合，显示最小的初始加载UI
  if (!isClient) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        backgroundColor: '#f5f5f7',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}>
        <div style={{
          fontSize: '18px',
          color: '#1d1d1f',
          textAlign: 'center'
        }}>
          加载中...
        </div>
      </div>
    );
  }
  
  // 显示加载中状态
  if (isLoading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        backgroundColor: getCurrentBackgroundColor(),
        color: isDark ? '#f5f5f7' : '#1d1d1f',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: getCurrentFont(),
        flexDirection: 'column',
        transition: 'background-color 0.3s ease, color 0.3s ease, font-family 0.3s ease'
      }}>
        <div style={{
          fontSize: '22px',
          fontWeight: '600',
          marginBottom: '16px'
        }}>
          加载中...
        </div>
        <div style={{
          width: '60px',
          height: '60px',
          border: `4px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
          borderRadius: '50%',
          borderTopColor: isDark ? '#0a84ff' : '#06c',
          animation: 'spin 1s linear infinite'
        }} />
        <style jsx global>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 苹果风格样式 - 添加移动端响应式样式
  const styles = {
    container: {
      height: '100vh',
      width: '100vw',
      backgroundColor: getCurrentBackgroundColor(),
      color: isDark ? '#f5f5f7' : '#1d1d1f',
      fontFamily: getCurrentFont(),
      overflow: 'hidden',
      position: 'relative',
      transition: 'background-color 0.3s ease, color 0.3s ease, font-family 0.3s ease',
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
      fontFamily: getCurrentFont(),
      transition: 'background-color 0.3s ease, color 0.3s ease, font-family 0.3s ease'
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
      width: '85%',
      maxWidth: '1000px',
      backgroundColor: isDark ? 'rgba(30, 30, 30, 0.8)' : 'rgba(245, 245, 247, 0.8)',
      borderRadius: '16px',
      padding: '12px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
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
    fontOptionContainer: {
      display: 'flex',
      flexDirection: 'column',
      marginBottom: '24px',
    },
    fontOptionLabel: {
      fontSize: '15px',
      marginBottom: '12px',
      color: isDark ? '#98989d' : '#8e8e93',
      textAlign: 'center',
    },
    fontSelect: {
      padding: '10px',
      borderRadius: '8px',
      border: `1px solid ${isDark ? '#424245' : '#d2d2d7'}`,
      backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
      color: isDark ? '#f5f5f7' : '#1d1d1f',
      fontSize: '15px',
      width: '100%',
      maxWidth: '300px',
      margin: '0 auto',
      fontFamily: getCurrentFont(),
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='${isDark ? '%23f5f5f7' : '%231d1d1f'}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 10px center',
      backgroundSize: '16px',
    },
    fontPreview: {
      marginTop: '16px',
      padding: '12px',
      borderRadius: '8px',
      backgroundColor: isDark ? 'rgba(60, 60, 60, 0.5)' : 'rgba(240, 240, 240, 0.5)',
      textAlign: 'center',
      fontSize: '16px',
      maxWidth: '300px',
      margin: '0 auto',
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

  // 根据周期内的进度获取颜色 - 红色到黄色到瑞幻蓝的渐变
  const getProgressColor = (progress) => {
    // 使用当前句子在25句周期内的位置来决定颜色
    // 计算当前句子在周期内的百分比
    const positionInCycle = getPositionInSegment() + 1; // 1-25
    const percentInCycle = (positionInCycle / cardSize) * 100; // 转为百分比
    
    if (percentInCycle < 33) {
      // 红色区域 (0-33%)
      return '#FF5252';
    } else if (percentInCycle < 66) {
      // 黄色区域 (33-66%)
      return '#FFD740';
    } else {
      // 瑞幕蓝色区域 (66-100%)
      return '#00A7E1';
    }
  };

  // 计算三个进度条段的进度
  const calculateProgressSegments = () => {
    // 计算当前已读句子数
    const totalSentencesRead = currentIndex - sessionStartIndex + 1;
    
    // 定义固定周期大小为25句
    const cycleSize = 25;
    
    // 三条进度条各占总进度的三分之一
    const firstSegmentMax = 33.33;
    const secondSegmentMax = 33.33;
    const thirdSegmentMax = 33.34;
    
    // 计算三个阶段的句子数
    const firstStageMaxSentences = Math.ceil(readingGoal * (firstSegmentMax / 100));
    const secondStageMaxSentences = Math.ceil(readingGoal * ((firstSegmentMax + secondSegmentMax) / 100));
    
    // 计算总周期数
    const totalCycles = Math.ceil(readingGoal / cycleSize);
    
    // 计算当前处于第几个周期（从1开始）
    const currentCycle = Math.floor((totalSentencesRead - 1) / cycleSize) + 1;
    
    // 计算在当前周期内的位置（1-25）
    const positionInCycle = ((totalSentencesRead - 1) % cycleSize) + 1;
    
    // 周期内的百分比进度（0-100%）
    const percentInCycle = (positionInCycle / cycleSize) * 100;
    
    // 计算三个进度条的值
    let firstSegmentProgress = 0;
    let secondSegmentProgress = 0;
    let thirdSegmentProgress = 0;
    
    // 计算每个阶段的周期数
    const firstStageCycles = Math.ceil(firstStageMaxSentences / cycleSize);
    const secondStageCycles = Math.ceil((secondStageMaxSentences - firstStageMaxSentences) / cycleSize);
    const thirdStageCycles = totalCycles - firstStageCycles - secondStageCycles;
    
    // 确定当前周期在哪个阶段
    if (currentCycle <= firstStageCycles) {
      // 在第一阶段内
      
      // 计算当前周期在第一阶段中的位置（从1开始）
      const cyclePositionInStage = currentCycle;
      
      // 计算当前周期应达到的最大进度值
      // 最后一个周期应该达到100%，之前的周期按比例递增
      const maxProgressForCycle = (cyclePositionInStage / firstStageCycles) * 100;
      
      // 根据当前周期内位置计算实际进度
      firstSegmentProgress = (percentInCycle / 100) * maxProgressForCycle;
      
    } else if (currentCycle <= firstStageCycles + secondStageCycles) {
      // 在第二阶段内
      firstSegmentProgress = 100; // 第一条进度条已满
      
      // 计算当前周期在第二阶段中的位置（从1开始）
      const cyclePositionInStage = currentCycle - firstStageCycles;
      
      // 计算当前周期应达到的最大进度值
      const maxProgressForCycle = (cyclePositionInStage / secondStageCycles) * 100;
      
      // 根据当前周期内位置计算实际进度
      secondSegmentProgress = (percentInCycle / 100) * maxProgressForCycle;
      
    } else {
      // 在第三阶段内
      firstSegmentProgress = 100; // 第一条进度条已满
      secondSegmentProgress = 100; // 第二条进度条已满
      
      // 计算当前周期在第三阶段中的位置（从1开始）
      const cyclePositionInStage = currentCycle - firstStageCycles - secondStageCycles;
      
      // 计算当前周期应达到的最大进度值
      const maxProgressForCycle = (cyclePositionInStage / thirdStageCycles) * 100;
      
      // 根据当前周期内位置计算实际进度
      thirdSegmentProgress = (percentInCycle / 100) * maxProgressForCycle;
    }
    
    return [firstSegmentProgress, secondSegmentProgress, thirdSegmentProgress];
  };

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

          {/* 新增：数据同步功能 */}
          <div style={{
            backgroundColor: isDark ? 'rgba(60, 60, 60, 0.5)' : 'rgba(240, 240, 240, 0.5)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              fontSize: '15px',
              fontWeight: '600',
              marginBottom: '12px',
              color: isDark ? '#f5f5f7' : '#1d1d1f',
              textAlign: 'center'
            }}>
              跨设备数据同步
            </div>
            
            <div style={{
              fontSize: '13px',
              color: isDark ? '#98989d' : '#8e8e93',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              导出您的数据，然后在其他设备上导入，实现数据同步
            </div>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <button
                onClick={exportData}
                style={{
                  ...styles.button,
                  backgroundColor: isDark ? '#2c2c2e' : '#e5e5ea',
                  color: isDark ? '#f5f5f7' : '#1d1d1f',
                  fontWeight: '500',
                  fontSize: '14px',
                  padding: '10px 16px'
                }}
              >
                导出数据备份
              </button>
              
              <div style={{
                position: 'relative',
                overflow: 'hidden'
              }}>
                <button
                  style={{
                    ...styles.button,
                    backgroundColor: isDark ? '#2c2c2e' : '#e5e5ea',
                    color: isDark ? '#f5f5f7' : '#1d1d1f',
                    fontWeight: '500',
                    fontSize: '14px',
                    padding: '10px 16px',
                    width: '100%'
                  }}
                >
                  导入数据备份
                </button>
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>
          </div>

          {/* 当前会话阅读进度 - 简化设计 */}
          <div style={styles.goalProgressContainer}>
            <div style={styles.goalProgressTitle}>
              当前阅读进度
            </div>
            <div style={{
              width: '100%',
              height: '6px',
              backgroundColor: 'transparent',
              borderRadius: '3px',
              overflow: 'hidden',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`,
              marginBottom: '8px',
            }}>
              <div 
                style={{
                  height: '100%',
                  backgroundColor: isGoalReached() ? 'rgba(48, 209, 88, 0.8)' : (isDark ? 'rgba(10, 132, 255, 0.8)' : 'rgba(0, 102, 204, 0.8)'),
                  borderRadius: '3px',
                  transition: 'width 0.3s ease',
                  width: goalProgressWidth
                }}
              />
            </div>
            <div style={styles.goalProgressText}>
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
          
          {/* 段落进度 - 简化设计 */}
          <div style={styles.goalProgressContainer}>
            <div style={styles.goalProgressTitle}>
              段落进度 (每{cardSize}句)
            </div>
            <div style={{
              width: '100%',
              height: '6px',
              backgroundColor: 'transparent',
              borderRadius: '3px',
              overflow: 'hidden',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`,
              marginBottom: '8px',
            }}>
              <div 
                style={{
                  height: '100%',
                  backgroundColor: `${getProgressColor(calculateSegmentInRemainingPercentage())}cc`, // 添加透明度
                  width: segmentProgressWidth,
                  borderRadius: '3px',
                  transition: 'width 0.3s ease, background-color 0.3s ease'
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
          
          {/* 字体选择器 - 添加字体导入功能 */}
          <div style={styles.fontOptionContainer}>
            <div style={styles.fontOptionLabel}>字体选择</div>
            <select 
              value={selectedFont}
              onChange={(e) => selectFont(e.target.value)}
              style={styles.fontSelect}
            >
              {/* 系统字体组 */}
              <optgroup label="系统字体">
                {fontOptions.filter(font => !font.id.startsWith('custom-')).map(font => (
                  <option key={font.id} value={font.id}>
                    {font.name}
                  </option>
                ))}
              </optgroup>
              
              {/* 自定义字体组 */}
              {customFonts.length > 0 && (
                <optgroup label="自定义字体">
                  {customFonts.map(font => (
                    <option key={font.id} value={font.id}>
                      {font.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            
            {/* 字体导入按钮 */}
            <div style={{
              marginTop: '12px',
              display: 'flex',
              justifyContent: 'center',
              gap: '10px'
            }}>
              <div style={{
                position: 'relative',
                overflow: 'hidden',
                display: 'inline-block'
              }}>
                <button style={{
                  border: 'none',
                  background: isDark ? '#2c2c2e' : '#f2f2f7',
                  padding: '6px 12px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  color: isDark ? '#f5f5f7' : '#1d1d1f',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <span>导入字体</span>
                </button>
                <input
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  onChange={handleFontUpload}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer'
                  }}
                />
              </div>
              
              {/* 管理字体按钮（如果有自定义字体） */}
              {customFonts.length > 0 && (
                <button
                  onClick={() => {
                    // 创建一个字体管理对话框
                    const message = customFonts.map((font, index) => 
                      `${index + 1}. ${font.name}`
                    ).join('\n');
                    
                    const fontIndex = window.prompt(
                      `输入要删除的字体编号（1-${customFonts.length}）：\n${message}`, 
                      ""
                    );
                    
                    if (fontIndex && !isNaN(fontIndex)) {
                      const index = parseInt(fontIndex) - 1;
                      if (index >= 0 && index < customFonts.length) {
                        const fontToDelete = customFonts[index];
                        if (window.confirm(`确定要删除字体 "${fontToDelete.name}" 吗？`)) {
                          deleteCustomFont(fontToDelete.id);
                        }
                      }
                    }
                  }}
                  style={{
                    border: 'none',
                    background: isDark ? '#2c2c2e' : '#f2f2f7',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    color: isDark ? '#f5f5f7' : '#1d1d1f',
                    cursor: 'pointer'
                  }}
                >
                  管理字体
                </button>
              )}
            </div>
            
            <div style={{
              ...styles.fontPreview,
              fontFamily: getCurrentFont(),
            }}>
              字体预览 - 這是中文示例
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
          
          <div style={styles.fontOptionContainer}>
            <div style={styles.fontOptionLabel}>字体大小</div>
            
            <div style={{
              display: 'flex', 
              gap: '16px', 
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              maxWidth: '300px',
              backgroundColor: isDark ? 'rgba(60, 60, 60, 0.5)' : 'rgba(240, 240, 240, 0.5)',
              borderRadius: '8px',
              padding: '12px'
            }}>
              <button 
                onClick={() => setFontSize(prev => Math.max(16, prev - 4))}
                style={{
                  ...styles.iconButton,
                  fontSize: '16px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
                  color: isDark ? '#f5f5f7' : '#1d1d1f',
                  border: `1px solid ${isDark ? '#424245' : '#d2d2d7'}`,
                }}
              >
                A-
              </button>
              
              <div style={{
                fontSize: '17px',
                color: isDark ? '#f5f5f7' : '#1d1d1f',
                fontWeight: '500',
                minWidth: '70px',
                textAlign: 'center'
              }}>
                {fontSize}px
              </div>
              
              <button 
                onClick={() => setFontSize(prev => Math.min(80, prev + 4))}
                style={{
                  ...styles.iconButton,
                  fontSize: '16px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
                  color: isDark ? '#f5f5f7' : '#1d1d1f',
                  border: `1px solid ${isDark ? '#424245' : '#d2d2d7'}`,
                }}
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
              marginBottom: '10px'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: isDark ? '#f5f5f7' : '#1d1d1f',
              }}>
                阅读进度: {calculateSessionProgress()}/{readingGoal}句 ({Math.round(calculateOverallPercentage())}%)
              </div>
            </div>
            
            {/* 分隔线 */}
            <div style={{
              width: '100%',
              height: '1px',
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              marginBottom: '8px'
            }} />
            
            {/* 段落进度标题 */}
            <div style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '4px'
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: isDark ? '#f5f5f7' : '#1d1d1f',
              }}>
                当前段落: {getSentencesInCurrentSegment()}/{cardSize}句 (第{getCurrentSegmentNumber()}段)
              </div>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: isDark ? '#f5f5f7' : '#1d1d1f',
              }}>
                {Math.round(calculateSegmentInRemainingPercentage())}%
              </div>
            </div>
            
            {/* 简化段落进度条设计 */}
            <div style={{
              width: '100%',
              marginBottom: '4px',
            }}>
              {/* 计算三个进度段 */}
              {(() => {
                const [firstProgress, secondProgress, thirdProgress] = calculateProgressSegments();
                
                // 计算当前循环
                const totalSentencesRead = currentIndex - sessionStartIndex + 1;
                const cycleSize = 25;
                const currentCycle = Math.floor(totalSentencesRead / cycleSize) + 1;
                
                return (
                  <>
                    {/* 第一段进度条 */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '4px'
                    }}>
                      <div style={{
                        fontSize: '10px',
                        color: isDark ? '#98989d' : '#8e8e93',
                      }}>
                        第一部分 (循环 {currentCycle})
                      </div>
                      <div style={{
                        fontSize: '10px',
                        color: isDark ? '#98989d' : '#8e8e93',
                      }}>
                        {Math.round(firstProgress)}%
                      </div>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      backgroundColor: 'transparent',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`,
                      marginBottom: '8px',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${firstProgress}%`,
                        backgroundColor: 'rgba(255, 82, 82, 0.8)', // 红色半透明
                        borderRadius: '3px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    
                    {/* 第二段进度条 */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '4px'
                    }}>
                      <div style={{
                        fontSize: '10px',
                        color: isDark ? '#98989d' : '#8e8e93',
                      }}>
                        第二部分 (循环 {currentCycle})
                      </div>
                      <div style={{
                        fontSize: '10px',
                        color: isDark ? '#98989d' : '#8e8e93',
                      }}>
                        {Math.round(secondProgress)}%
                      </div>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      backgroundColor: 'transparent',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`,
                      marginBottom: '8px',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${secondProgress}%`,
                        backgroundColor: 'rgba(255, 215, 64, 0.8)', // 黄色半透明
                        borderRadius: '3px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    
                    {/* 第三段进度条 */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '4px'
                    }}>
                      <div style={{
                        fontSize: '10px',
                        color: isDark ? '#98989d' : '#8e8e93',
                      }}>
                        第三部分 (循环 {currentCycle})
                      </div>
                      <div style={{
                        fontSize: '10px',
                        color: isDark ? '#98989d' : '#8e8e93',
                      }}>
                        {Math.round(thirdProgress)}%
                      </div>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      backgroundColor: 'transparent',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`,
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${thirdProgress}%`,
                        backgroundColor: 'rgba(0, 167, 225, 0.8)', // 瑞幻蓝半透明
                        borderRadius: '3px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </>
                );
              })()}
            </div>
            
            {/* 添加简洁的文本导航控件 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '8px',
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
              paddingTop: '8px',
              width: '100%'
            }}>
              <div style={{
                fontSize: '11px', 
                color: isDark ? '#98989d' : '#8e8e93',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span>文本导航:</span>
                <input
                  type="number"
                  min="1"
                  max={formattedText.length}
                  value={currentIndex + 1}
                  onChange={(e) => {
                    const pageNum = parseInt(e.target.value);
                    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= formattedText.length) {
                      setCurrentIndex(pageNum - 1);
                    }
                  }}
                  style={{
                    width: '50px',
                    padding: '3px 5px',
                    borderRadius: '4px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
                    backgroundColor: isDark ? 'rgba(30,30,30,0.5)' : 'rgba(255,255,255,0.5)',
                    color: isDark ? '#f5f5f7' : '#1d1d1f',
                    fontSize: '11px',
                    textAlign: 'center'
                  }}
                />
                <span>/</span>
                <span>{formattedText.length}</span>
              </div>
              
              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                <button
                  onClick={() => setCurrentIndex(0)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: isDark ? '#0a84ff' : '#06c',
                    fontSize: '11px',
                    padding: '0',
                    cursor: 'pointer',
                    opacity: 0.7,
                    transition: 'opacity 0.2s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.opacity = 1 }}
                  onMouseOut={(e) => { e.currentTarget.style.opacity = 0.7 }}
                >
                  首页
                </button>
                <button
                  onClick={() => setCurrentIndex(Math.floor(formattedText.length / 2) - 1)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: isDark ? '#0a84ff' : '#06c',
                    fontSize: '11px',
                    padding: '0',
                    cursor: 'pointer',
                    opacity: 0.7,
                    transition: 'opacity 0.2s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.opacity = 1 }}
                  onMouseOut={(e) => { e.currentTarget.style.opacity = 0.7 }}
                >
                  中间
                </button>
                <button
                  onClick={() => setCurrentIndex(formattedText.length - 1)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: isDark ? '#0a84ff' : '#06c',
                    fontSize: '11px',
                    padding: '0',
                    cursor: 'pointer',
                    opacity: 0.7,
                    transition: 'opacity 0.2s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.opacity = 1 }}
                  onMouseOut={(e) => { e.currentTarget.style.opacity = 0.7 }}
                >
                  末页
                </button>
              </div>
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

        {/* 底部进度条 - 简化设计 */}
        <div 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '3px', // 减小高度
            backgroundColor: `${getProgressColor(calculateSegmentInRemainingPercentage())}cc`, // 添加透明度
            transition: 'width 0.3s ease, background-color 0.3s ease',
            width: progressWidth,
            boxShadow: '0 0 3px rgba(0,0,0,0.1)', // 添加微妙阴影
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

          {/* 字体选择器 - 添加字体导入功能 */}
          <div style={styles.fontOptionContainer}>
            <div style={styles.fontOptionLabel}>字体选择</div>
            <select 
              value={selectedFont}
              onChange={(e) => selectFont(e.target.value)}
              style={styles.fontSelect}
            >
              {/* 系统字体组 */}
              <optgroup label="系统字体">
                {fontOptions.filter(font => !font.id.startsWith('custom-')).map(font => (
                  <option key={font.id} value={font.id}>
                    {font.name}
                  </option>
                ))}
              </optgroup>
              
              {/* 自定义字体组 */}
              {customFonts.length > 0 && (
                <optgroup label="自定义字体">
                  {customFonts.map(font => (
                    <option key={font.id} value={font.id}>
                      {font.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            
            {/* 字体导入按钮 */}
            <div style={{
              marginTop: '12px',
              display: 'flex',
              justifyContent: 'center',
              gap: '10px'
            }}>
              <div style={{
                position: 'relative',
                overflow: 'hidden',
                display: 'inline-block'
              }}>
                <button style={{
                  border: 'none',
                  background: isDark ? '#2c2c2e' : '#f2f2f7',
                  padding: '6px 12px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  color: isDark ? '#f5f5f7' : '#1d1d1f',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <span>导入字体</span>
                </button>
                <input
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  onChange={handleFontUpload}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer'
                  }}
                />
              </div>
              
              {/* 管理字体按钮（如果有自定义字体） */}
              {customFonts.length > 0 && (
                <button
                  onClick={() => {
                    // 创建一个字体管理对话框
                    const message = customFonts.map((font, index) => 
                      `${index + 1}. ${font.name}`
                    ).join('\n');
                    
                    const fontIndex = window.prompt(
                      `输入要删除的字体编号（1-${customFonts.length}）：\n${message}`, 
                      ""
                    );
                    
                    if (fontIndex && !isNaN(fontIndex)) {
                      const index = parseInt(fontIndex) - 1;
                      if (index >= 0 && index < customFonts.length) {
                        const fontToDelete = customFonts[index];
                        if (window.confirm(`确定要删除字体 "${fontToDelete.name}" 吗？`)) {
                          deleteCustomFont(fontToDelete.id);
                        }
                      }
                    }
                  }}
                  style={{
                    border: 'none',
                    background: isDark ? '#2c2c2e' : '#f2f2f7',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    color: isDark ? '#f5f5f7' : '#1d1d1f',
                    cursor: 'pointer'
                  }}
                >
                  管理字体
                </button>
              )}
            </div>
            
            <div style={{
              ...styles.fontPreview,
              fontFamily: getCurrentFont(),
            }}>
              字体预览 - 這是中文示例
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