// 添加一个小的更新
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getSavedSentences, saveSentence, deleteSentence } from '../utils/sentence-saver';
import SearchModal from '../components/SearchModal'; 

// 辅助函数：将文本切分成句子（改进版，更健壮）
const splitIntoSentences = (text) => {
  if (!text) return [];
  // 使用更可靠的正则表达式匹配中文和英文的句子结束符，并保留结束符
  return text
    .split(/([，。？！；])/g)
    .reduce((acc, curr, i, arr) => {
      if (i % 2 === 0) {
        const nextItem = arr[i + 1];
        return acc.concat(curr + (nextItem || ''));
      }
      return acc;
    }, [])
    .filter(s => s.trim());
};
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
  const segmentSize = 25;
  
  // 确定当前在第几个段落 (从0开始)
  const currentSegmentIndex = Math.floor(totalRead / segmentSize);
  
  // 当前段落内已读句子数 (0-24)
  const readInCurrentSegment = totalRead % segmentSize;
  
  // 如果readInCurrentSegment为0且totalRead不为0，说明刚好读完一段，返回0%
  if (readInCurrentSegment === 0 && totalRead > 0) {
    return 0;
  }
  
  // 每段结束时的目标进度百分比
  const segmentEndPercent = Math.min(((currentSegmentIndex + 1) * segmentSize / goal) * 100, 100);
  
  // 计算段内的进度百分比
  return (readInCurrentSegment / segmentSize) * segmentEndPercent;
};

// 获取当前位于哪个段落 (1-N)
const getCurrentSegmentNumber = (totalRead, goal) => {
  // 固定每段为25句
  const fixedSegmentSize = 25;
  // 计算总段数
  const totalSegments = Math.max(1, Math.ceil(goal / fixedSegmentSize));
  return Math.min(Math.floor(totalRead / fixedSegmentSize) + 1, totalSegments);
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

// 获取总段数
const getTotalSegments = (goal) => {
  const fixedSegmentSize = 25;
  return Math.max(1, Math.ceil(goal / fixedSegmentSize));
};

export default function Home() {
  // 添加客户端渲染检测状态
  const [isClient, setIsClient] = useState(false);
  const [text, setText] = useState('');
  const [formattedText, setFormattedText] = useState([]);
  const [isReading, setIsReading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [fontSize, setFontSize] = useState(20); // 先设置为默认值
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
  // 新增：庆祝动画状态
  const [showCelebration, setShowCelebration] = useState(false);
  // 新增：已完成的句子数
  const [completedSentences, setCompletedSentences] = useState(0);
  // 新增：保存的句子状态
  const [savedSentences, setSavedSentences] = useState([]);
  // 新增：笔记本显示状态
  const [showNotebook, setShowNotebook] = useState(false);
  const [lastGoalSetDate, setLastGoalSetDate] = useState(null); // 新增：记录上次设置阅读目标的日期
  const [todayCompletedSentences, setTodayCompletedSentences] = useState(0); // 新增：记录今日已阅读的句子数
  const [goalCompleted, setGoalCompleted] = useState(false); // 新增：记录今日阅读目标是否已完成
  const [searchQuery, setSearchQuery] = useState(''); // New state for search query
  const [searchResults, setSearchResults] = useState([]); // New state for search results
  const [isSearching, setIsSearching] = useState(false); // New state for search loading
  const [error, setError] = useState(null); // New state for search error
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false); // 新增：控制搜索模态框的状态
  const [searchStartIndex, setSearchStartIndex] = useState(0); // 新增：记录打开搜索时的句子索引
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false); // 新增：控制保存句子后的确认状态
  const fileInputRef = useRef(null); // Hidden file input ref
  const coverImageInputRef = useRef(null); // Hidden cover image input ref
  const [editingCoverIndex, setEditingCoverIndex] = useState(null); // Index of text being edited for cover image

  // === 恢复: 执行搜索的函数 ===
  const handleSearch = () => { 
    const query = searchQuery.trim().toLowerCase(); // 准备查询词，忽略大小写
    if (!query) {
      // 可以选择不提示，或者在这里设置一个 error 状态
      setSearchResults([]);
      setError(null);
      return;
    }

    setIsSearching(true);
    setSearchResults([]); // 清空旧结果
    setError(null); // 清空旧错误

    try {
      // 直接从 state 读取 savedTexts
      const localResults = savedTexts
        .map(textItem => {
          if (!textItem || typeof textItem.content !== 'string' || typeof textItem.name !== 'string') {
            console.warn('Skipping invalid text item in savedTexts:', textItem);
            return null;
          }

          const contentLower = textItem.content.toLowerCase();
          const nameLower = textItem.name.toLowerCase();

          // 初步检查文档内容或名称是否包含关键词
          if (contentLower.includes(query) || nameLower.includes(query)) {
            // 切分文档内容为句子
            const allSentences = splitIntoSentences(textItem.content);

            // 查找匹配的句子并记录其索引位置
            const matchingSentencesWithPositions = [];
            
            allSentences.forEach((sentence, index) => {
              if (typeof sentence === 'string' && sentence.toLowerCase().includes(query)) {
                matchingSentencesWithPositions.push({
                  text: sentence,
                  position: index // 记录句子在原文中的索引位置
                });
              }
            });

            // 如果找到了匹配的句子，则返回结果对象
            if (matchingSentencesWithPositions.length > 0) {
              return {
                doc_id: textItem.name,
                sentences: matchingSentencesWithPositions // 包含所有匹配句子及其位置的数组
              };
            }
          }
          return null; // 如果文档不匹配或没有匹配句子，返回null
        })
        .filter(result => result !== null); // 过滤掉所有null结果

      setSearchResults(localResults); // 更新搜索结果状态

      // 如果没有找到任何结果，设置提示信息
      if (localResults.length === 0) {
        // setError('没有在本地保存的文本中找到包含该词的句子。'); // 可以取消错误提示，让 SearchModal 显示默认消息
      }

    } catch (err) { // 捕获处理过程中的错误
      console.error('前端搜索执行出错:', err);
      setError(`搜索时发生错误: ${err.message}`);
      setSearchResults([]);
    } finally {
      setIsSearching(false); // 结束搜索状态
    }
  };
  // ============================

  // 确保文件选择器引用正确
  const handleAddImageClick = () => {
    console.log('Add image button clicked');
    if (coverImageInputRef.current) {
      coverImageInputRef.current.click();
    }
  };

  // 处理封面图片文件选择
  const handleFileSelected = (event) => {
    const file = event.target.files[0];
    console.log('[handleFileSelected] File selected:', file);
    if (file && editingCoverIndex !== null) {
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('[handleFileSelected] File read success. Updating state for index:', editingCoverIndex);
        const updatedTexts = savedTexts.map((text, index) => {
          if (index === editingCoverIndex) {
            // Ensure compatibility with existing structure, assuming 'id' exists
            return { ...text, coverImage: reader.result };
          }
          return text;
        });
        setSavedTexts(updatedTexts);
        localStorage.setItem('savedTexts', JSON.stringify(updatedTexts)); // 持久化到 localStorage
        setEditingCoverIndex(null); // Reset editing index after update
      };
      reader.onerror = (error) => {
        console.error('[handleFileSelected] Error reading file:', error);
        setEditingCoverIndex(null); // Also reset on error
      };
      reader.readAsDataURL(file);
    } else {
      console.log('[handleFileSelected] No file selected or index invalid. Resetting index.');
      setEditingCoverIndex(null); // Reset if no file selected or index is null
    }
  };

  // 处理点击封面图片以触发文件选择
  const handleCoverImageClick = (index, e) => {
    console.log(`[handleCoverImageClick] Triggered for index: ${index}`);
    e.stopPropagation(); // Ensure we still stop propagation
    setEditingCoverIndex(index); // Set which card's cover is being edited
    // Trigger the hidden file input click
    if (coverImageInputRef.current) {
      // Reset value to allow selecting the same file again
      coverImageInputRef.current.value = null;
      console.log('[handleCoverImageClick] Clicking hidden cover image input');
      coverImageInputRef.current.click();
    } else {
      console.error('[handleCoverImageClick] coverImageInputRef is null or not mounted.');
    }
  };

  // 字体大小调整函数
  const adjustFontSize = (delta) => {
    // 计算新字体大小，限制在 12px 到 72px 之间
    const newSize = Math.max(12, Math.min(72, fontSize + delta));
    // 更新 React 状态
    setFontSize(newSize);
    // 保存到 localStorage
    localStorage.setItem('fontSize', newSize.toString());
  };

  // 处理右键点击事件的函数
  const handleContextMenu = useCallback((event) => {
    // 阻止默认的右键菜单
    event.preventDefault();
    // 退回到上一句 (确保不会小于 0)
    setCurrentIndex(prevIndex => Math.max(0, prevIndex - 1));
  }, [setCurrentIndex]);

  // === 移动到这里：添加右键返回上一句的监听器 ===
  useEffect(() => {
    // 只在客户端执行
    if (typeof window !== 'undefined') {
      document.addEventListener('contextmenu', handleContextMenu);
    }
    // 组件卸载时移除监听器
    return () => {
      if (typeof window !== 'undefined') {
        document.removeEventListener('contextmenu', handleContextMenu);
      }
    };
  }, [handleContextMenu]);
  // =============================================

  // 初始化客户端检测和加载 localStorage 数据
  useEffect(() => {
    setIsClient(true);
    
    // === 新增：加载字体大小 ===
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
      setFontSize(parseInt(savedFontSize));
    }
    // ========================
    
    // 检测深色模式
    const darkModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    if (darkModeMedia.matches) {
      setIsDark(true);
    }

    // 设置字体大小，根据屏幕宽度自动调整
    function updateFontSize() {
      // === 新增：如果用户已设置，则不自动调整 ===
      if (localStorage.getItem('fontSize')) {
        return; 
      }
      // =======================================
      
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
      // 新增：加载上次设置阅读目标的日期
      const savedGoalDate = localStorage.getItem('lastGoalSetDate');
      // 新增：加载今日已完成的句子数
      const savedCompletedSentences = localStorage.getItem('todayCompletedSentences');
      // 新增：加载目标完成状态
      const savedGoalCompleted = localStorage.getItem('goalCompleted');
      // 新增：加载自定义字体
      const savedCustomFonts = localStorage.getItem('customFonts');
      
      // 新增：加载保存的句子
      setSavedSentences(getSavedSentences());
      
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
      
      // 加载上次设置阅读目标的日期
      if (savedGoalDate) {
        setLastGoalSetDate(savedGoalDate);
      }
      
      // 加载今日已完成的句子数
      if (savedCompletedSentences && savedGoalDate) {
        const today = new Date().toISOString().split('T')[0];
        // 只有当上次设置的日期是今天时，才加载已完成的句子数
        if (savedGoalDate === today) {
          setTodayCompletedSentences(parseInt(savedCompletedSentences));
        } else {
          // 如果不是今天，重置为0
          localStorage.removeItem('todayCompletedSentences');
        }
      }
      
      // 加载目标完成状态
      if (savedGoalCompleted && savedGoalDate) {
        const today = new Date().toISOString().split('T')[0];
        // 只有当上次设置的日期是今天时，才加载目标完成状态
        if (savedGoalDate === today) {
          setGoalCompleted(savedGoalCompleted === 'true');
        } else {
          // 如果不是今天，重置为false
          localStorage.removeItem('goalCompleted');
        }
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
    if (!isClient) return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'; // 服务器端渲染时的默认值
    
    // 先在系统字体中查找
    const systemFont = fontOptions.find(font => font.id === selectedFont);
    if (systemFont) return systemFont.value;
    
    // 如果是自定义字体，返回字体名称
    const customFont = customFonts.find(font => font.id === selectedFont);
    if (customFont) return customFont.value;
    
    // 默认返回系统字体
    return 'CangErJinKai, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
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
    // 只保存阅读目标数量，不修改设置日期
    // 这样在toggleReadingMode中设置的日期信息就不会被覆盖
    localStorage.setItem('readingGoal', readingGoal.toString());
  }, [readingGoal]);

  // 计算当前阅读会话的进度
  const calculateSessionProgress = () => {
    const sentencesRead = currentIndex - sessionStartIndex + 1;
    // 返回当前会话的进度（不包括之前已完成的）
    return Math.min(Math.max(sentencesRead, 0), Math.max(readingGoal - todayCompletedSentences, 0));
  };
  
  // 获取今日总进度（包括之前已完成的和当前会话的）
  const calculateTotalProgress = () => {
    return todayCompletedSentences + calculateSessionProgress();
  };
  
  // 检查是否已达成阅读目标
  const isGoalReached = () => {
    return calculateTotalProgress() >= readingGoal;
  };
  
  // 检查阅读目标是否刚刚达成（用于触发庆祝动画）
  const justReachedGoal = (prevIndex, newIndex) => {
    if (!isReading) return false;
    
    const prevSentencesRead = prevIndex - sessionStartIndex + 1;
    const newSentencesRead = newIndex - sessionStartIndex + 1;
    
    // 如果之前的总进度小于目标，而新的总进度大于等于目标，则表示刚刚达成目标
    const prevTotalProgress = todayCompletedSentences + Math.max(prevSentencesRead, 0);
    const newTotalProgress = todayCompletedSentences + Math.max(newSentencesRead, 0);
    
    return prevTotalProgress < readingGoal && newTotalProgress >= readingGoal;
  };

  // 计算当前会话进度百分比
  const calculateSessionProgressPercentage = () => {
    return (calculateSessionProgress() / Math.max(readingGoal - todayCompletedSentences, 1)) * 100;
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

  // 根据周期内的进度获取颜色 - 固定为单一蓝色
  const getProgressColor = () => {
    // 统一使用蓝色
    return isDark ? '#0a84ff' : '#06c';
  };

  // 保存当前句子到笔记本
  const saveCurrentSentence = () => {
    if (!isClient || !formattedText || formattedText.length === 0 || currentIndex < 0 || currentIndex >= formattedText.length) {
      return;
    }
    
    // 获取当前句子
    const sentence = formattedText[currentIndex];
    
    // 获取当前文本的名称
    const source = savedTexts.length > 0 && selectedSavedText !== null 
      ? savedTexts[selectedSavedText].name 
      : '未知来源';
    
    // 使用工具函数保存句子
    const result = saveSentence(sentence, source, currentIndex);
    
    if (result.success) {
      // 更新状态
      setSavedSentences(getSavedSentences());
      
      // 显示确认状态，代替 alert
      setShowSaveConfirmation(true);
      setTimeout(() => {
        setShowSaveConfirmation(false);
      }, 1500); // 1.5秒后自动隐藏确认状态
    } else {
      // 保存失败
      alert('保存句子失败，请重试');
    }
  };
  
  // 删除收藏的句子
  const deleteSavedSentence = (id) => {
    if (!isClient) return;
    
    // 确认删除
    if (window.confirm('确定要删除这个收藏的句子吗？')) {
      // 使用工具函数删除句子
      const result = deleteSentence(id);
      
      if (result.success) {
        // 更新状态
        setSavedSentences(getSavedSentences());
      } else {
        alert('删除失败，请重试');
      }
    }
  };
  
  // 跳转到收藏句子的原始位置
  const jumpToSavedSentence = (position, source) => {
    if (!isClient) return;
    
    // 查找句子所在的文本索引
    let textIndex = null;
    
    if (source !== '未知来源') {
      // 查找对应文本的索引
      textIndex = savedTexts.findIndex(text => text.name === source);
    }
    
    // 如果找到了对应的文本
    if (textIndex !== null && textIndex !== -1) {
      // 加载该文本
      loadSavedText(textIndex);
      
      // 设置当前位置
      setCurrentIndex(position);
      
      // 关闭笔记本模态框
      setShowNotebook(false);
      
      // 如果不在阅读模式，切换到阅读模式
      if (!isReading) {
        toggleReadingMode();
      }
    } else {
      alert('无法找到原始文本，可能已被删除。');
    }
  };

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
    if (!isClient) return isDark ? '#000000' : '#f5f5f7'; // 服务器端渲染时的默认值
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
          
          // 处理当前块，使用统一的 splitIntoSentences 函数
          const chunkSentences = splitIntoSentences(chunk);
          
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
          // 使用统一的 splitIntoSentences 函数
          const sentences = splitIntoSentences(inputText);
          
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

  const saveText = async (name, content) => { 
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

      // === 新增：发送到后端 API ===
      try {
        const response = await fetch('/api/save-uploaded-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ filename: name, content: content }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('后端保存文件失败:', errorData.message || response.statusText);
          // 这里可以选择是否通知用户，或者只是记录日志
        }
      } catch (apiError) {
        console.error('调用后端 API 失败:', apiError);
        // 网络错误等
      }
      // ===========================

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
      // 开始阅读模式
      // 检查是否需要询问今日目标
      const today = new Date().toISOString().split('T')[0]; // 获取当前日期，格式为 YYYY-MM-DD
      const shouldAskGoal = !lastGoalSetDate || lastGoalSetDate !== today || goalCompleted;
      
      if (shouldAskGoal) {
        // 如果是新的一天、之前没有设置过目标或目标已完成，询问用户
        const promptMessage = goalCompleted 
          ? '您已完成当前阅读目标，请设置新的阅读目标句子数：' 
          : '请输入今日计划阅读句子数：';
        
        const input = window.prompt(promptMessage, readingGoal);
        if (input !== null) {
          const goal = parseInt(input, 10);
          if (!isNaN(goal) && goal > 0) {
            setReadingGoal(goal);
            // 保存今日日期和目标
            setLastGoalSetDate(today);
            localStorage.setItem('lastGoalSetDate', today);
            localStorage.setItem('readingGoal', goal.toString());
            
            if (goalCompleted) {
              // 如果是已完成目标后重新设置，重置已完成状态和今日已读数
              setGoalCompleted(false);
              localStorage.setItem('goalCompleted', 'false');
              setTodayCompletedSentences(0);
              localStorage.setItem('todayCompletedSentences', '0');
            } else {
              // 如果不是今天，重置为0
              localStorage.removeItem('todayCompletedSentences');
            }
          }
        }
      } else {
        // 如果已经设置了当天的目标，考虑已完成的句子数
        const remainingGoal = Math.max(readingGoal - todayCompletedSentences, 0);
        console.log(`今日已读：${todayCompletedSentences}句，剩余目标：${remainingGoal}句`);
        // 不需要修改readingGoal，因为我们在显示和计算时会考虑已完成的部分
      }
      
      // 设置当前会话起点
      setSessionStartIndex(currentIndex);
      // 重置庆祝状态
      setShowCelebration(false);
    } else {
      // 退出阅读模式
      // 计算这次会话阅读了多少句
      const sentencesRead = currentIndex - sessionStartIndex + 1;
      if (sentencesRead > 0) {
        // 更新今日已完成的句子数
        const newCompleted = todayCompletedSentences + sentencesRead;
        setTodayCompletedSentences(newCompleted);
        localStorage.setItem('todayCompletedSentences', newCompleted.toString());
        console.log(`本次阅读了${sentencesRead}句，今日总计：${newCompleted}句`);
        
        // 检查是否已达到目标
        if (newCompleted >= readingGoal && !goalCompleted) {
          setGoalCompleted(true);
          localStorage.setItem('goalCompleted', 'true');
        }
      }
    }
    setIsReading(!isReading);
  };

  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    const prevIndex = currentIndex;
    const newIndex = Math.min(formattedText.length - 1, prevIndex + 1);
    
    // 如果下一个操作会刚好达成阅读目标
    if (justReachedGoal(prevIndex, newIndex)) {
      // 设置当前会话已完成的句子数（而不是目标总数）
      // 我们使用calculateSessionProgress而不是readingGoal，因为前者已经考虑了todayCompletedSentences
      setCompletedSentences(calculateSessionProgress());
      // 显示庆祝动画
      setShowCelebration(true);
      // 设置目标已完成标志
      setGoalCompleted(true);
      localStorage.setItem('goalCompleted', 'true');
      
      // 更新索引
      setCurrentIndex(newIndex);
      
      // 但不立即自动返回首页，让动画完成后再返回
    } else {
      // 正常更新索引
      setCurrentIndex(newIndex);
    }
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

  // 处理搜索结果选择
  const handleSearchResult = (result) => {
    // 如果没有结果，直接返回
    if (!result) return;
    
    // 获取文件名
    const textName = result.path.split('/').pop();
    
    // 设置文本内容
    setText(result.content);
    setFormattedText(formatText(result.content));
    
    // 跳转到匹配位置
    if (result.context && result.context.match) {
      setCurrentIndex(result.content.indexOf(result.context.match));
    }
    
    // 开始阅读模式
    setIsReading(true);
    
    // 关闭搜索面板
    setShowSearch(false);
    
    // 保存文本
    saveText(textName, result.content);
  };

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
  
  // 导入数据功能
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

  // 添加：导出笔记为TXT文件的函数
  const exportNotebookToTxt = () => {
    // 检查是否有保存的笔记
    if (!savedSentences || savedSentences.length === 0) {
      alert('没有笔记可导出');
      return;
    }
    
    // 创建文件内容
    let content = '我的阅读笔记\n\n';
    content += `导出时间：${new Date().toLocaleString()}\n\n`;
    content += '--------------------------------\n\n';
    
    // 遍历所有笔记，添加到内容中
    savedSentences.forEach((sentence, index) => {
      // 格式化日期
      const date = new Date(sentence.date);
      const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      
      content += `【${index + 1}】${sentence.text}\n`;
      content += `来源：${sentence.source}\n`;
      content += `保存日期：${formattedDate}\n\n`;
      content += '--------------------------------\n\n';
    });
    
    // 创建Blob对象
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    
    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `我的阅读笔记_${new Date().toISOString().split('T')[0]}.txt`;
    
    // 触发下载
    document.body.appendChild(a);
    a.click();
    
    // 清理
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
    
    alert('笔记已成功导出为TXT文件');
  };

  // 管理庆祝动画的useEffect
  useEffect(() => {
    // 只有当showCelebration为true时才执行
    if (showCelebration) {
      // 庆祝画面显示时间
      const celebrationDuration = 3000; // 修改为3秒钟，让用户更快地返回主页
      
      // 设置一个定时器，在显示结束后自动返回主页面
      const timer = setTimeout(() => {
        setShowCelebration(false);
        setIsReading(false); // 退出阅读模式
      }, celebrationDuration);
      
      // 清理函数
      return () => {
        clearTimeout(timer);
      };
    }
  }, [showCelebration, setShowCelebration, setIsReading]);

  // 显示庆祝动画
  if (showCelebration && isClient) { // 确保只在客户端渲染庆祝动画
    const bgColor = getCurrentBackgroundColor();
    const fontFamily = getCurrentFont();
    const textColor = isDark ? '#f5f5f7' : '#1d1d1f';
    const buttonBgColor = isDark ? 'rgba(60, 60, 60, 0.6)' : 'rgba(240, 240, 240, 0.6)';
    const highlightColor = isDark ? '#0a84ff' : '#007aff';
    
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        backgroundColor: bgColor,
        color: textColor,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: fontFamily,
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '90%',
          backgroundColor: isDark ? 'rgba(30, 30, 30, 0.8)' : 'rgba(250, 250, 250, 0.8)',
          padding: '40px 30px',
          borderRadius: '20px',
          boxShadow: isDark ? '0 10px 25px rgba(0, 0, 0, 0.3)' : '0 10px 25px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            fontSize: '40px',
            marginBottom: '20px',
          }}>
            🎉
          </div>
          
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            marginBottom: '16px',
            color: highlightColor
          }}>
            恭喜你！
          </div>
          
          <div style={{
            fontSize: '20px',
            fontWeight: '500',
            marginBottom: '24px',
            color: textColor
          }}>
            已完成今日阅读目标 <span style={{color: highlightColor, fontWeight: '700'}}>{completedSentences}</span> 句
          </div>
          
          <div style={{
            width: '80%',
            margin: '0 auto 20px auto',
            height: '8px',
            backgroundColor: isDark ? 'rgba(60, 60, 60, 0.6)' : 'rgba(220, 220, 220, 0.6)',
            borderRadius: '12px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: '100%',
              backgroundColor: highlightColor,
              borderRadius: '12px'
            }}/>
          </div>
          
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '20px',
            color: highlightColor
          }}>
            目标达成率: 100%
          </div>
          
          <div style={{
            fontSize: '14px',
            color: isDark ? '#98989d' : '#8e8e93',
            marginBottom: '20px'
          }}>
            坚持阅读，每天进步！
          </div>
          
          {/* 返回主页按钮 */}
          <button
            onClick={() => {
              setShowCelebration(false);
              setIsReading(false);
            }}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: highlightColor,
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            返回主页
          </button>
        </div>
      </div>
    );
  }

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
      fontSize: `${fontSize}px`, // 应用字体大小
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
    libraryContainer: { // Keep container padding
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
      width: '90%',
      maxWidth: '90%',
      margin: '0 auto',
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
      width: '90%',
      maxWidth: '90%',
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
      backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='${isDark ? '%23f5f5f7' : '%231d1d1f'}' stroke='${isDark ? '%23f5f5f7' : '%231d1d1f'}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
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
    // --- New Styles for Grid Layout --- 
    savedFilesContainer: { // Keep container padding
      marginTop: '30px',
      padding: '0 20px',
    },
    subHeader: { // Keep subHeader style
      fontSize: '24px', // Make header larger
      fontWeight: 'bold',
      marginBottom: '25px', // More space below header
      color: isDark ? '#f5f5f7' : '#1d1d1f',
    },
    gridContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '25px', // Space between grid items
      justifyContent: 'flex-start', // Align items to the start
    },
    gridItem: (isDark) => ({
      backgroundColor: isDark ? '#2c2c2e' : '#ffffff',
      borderRadius: '10px',
      border: `1px solid ${isDark ? '#38383a' : '#e5e5e7'}`,
      // padding: '15px', // Padding will be applied to inner content instead
      width: 'calc(33.333% - 17px)', // Aim for 3 columns, adjusted for 25px gap
      minWidth: '180px', // Minimum width before wrapping
      boxShadow: isDark 
        ? '0 4px 12px rgba(0, 0, 0, 0.3)' 
        : '0 4px 12px rgba(0, 0, 0, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      cursor: 'pointer',
      overflow: 'hidden', // Ensure content respects border radius
      '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: isDark ? '0 6px 16px rgba(0, 0, 0, 0.4)' : '0 6px 16px rgba(0, 0, 0, 0.12)',
      },
    }),
    gridItemImagePlaceholder: (isDark) => ({ // Placeholder for the book cover
      width: '100%',
      paddingTop: '140%', // Aspect ratio from original placeholder style
      backgroundColor: isDark ? '#3a3a3c' : '#e5e5ea',
      // Removed border radius from here, applied to parent gridItem
      marginBottom: '0', // No margin needed if padding is on content
    }),
    gridItemContent: {
      flexGrow: 1, // Allow content to fill space
      padding: '12px 15px 10px 15px', // Padding for title and meta
    },
    gridItemTitle: (isDark) => ({
      fontSize: '15px', // Slightly smaller title
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#000000',
      marginBottom: '5px',
      display: '-webkit-box',
      WebkitLineClamp: 2, // Limit title to 2 lines
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      minHeight: '36px', // Ensure space for two lines (adjust based on font size/line height)
      lineHeight: '1.2',
    }),
    gridItemMeta: (isDark) => ({
      fontSize: '12px',
      color: isDark ? '#8e8e93' : '#666666',
      display: 'flex', 
      gap: '5px',
      marginTop: '5px', // Reduced top margin
    }),
    gridItemTag: (isDark) => ({
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      padding: '2px 6px',
      borderRadius: '4px',
      fontSize: '11px', // Smaller tag font
    }),
    gridItemActions: {
      display: 'flex',
      justifyContent: 'flex-end', // Align buttons to the right
      padding: '5px 10px 10px 10px', // Padding for buttons area
      // borderTop: `1px solid ${isDark ? '#3a3a3c' : '#e5e5ea'}`, // Optional separator
      gap: '8px', // Space between buttons
    },
    gridActionButton: (isDark) => ({
      background: 'none',
      border: `1px solid ${isDark ? '#48484a' : '#d1d1d6'}`, // Subtle border
      padding: '4px 10px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500',
      color: isDark ? '#c7c7cc' : '#343437',
      borderRadius: '6px',
      transition: 'background-color 0.2s ease, border-color 0.2s ease',
      '&:hover': {
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        borderColor: isDark ? '#5a5a5d' : '#bxbxbx',
      }
    }),
    // --- End of Grid Styles --- 
    deleteButton: (isDark) => ({
      // Specific styles for delete button if needed (e.g., color)
      color: isDark ? '#ff453a' : '#d12727',
      '&:hover': {
        // Hover styles specific to delete, inheriting from gridActionButton hover
        backgroundColor: isDark ? 'rgba(255, 69, 58, 0.15)' : 'rgba(209, 39, 39, 0.1)',
        borderColor: isDark ? 'rgba(255, 69, 58, 0.5)' : 'rgba(209, 39, 39, 0.5)',
        color: isDark ? '#ff453a' : '#d12727', // Keep color on hover
      }
    }),
  };

  // 阅读时的进度条宽度
  const progressWidth = formattedText.length > 0 
    ? `${((currentIndex + 1) / formattedText.length) * 100}%` 
    : '0%';

  // 计算当前总阅读量
  const totalReadCount = calculateTotalProgress();
  
  // 当前段落号（1-4）
  const currentSegmentNum = Math.min(Math.floor(totalReadCount / Math.ceil(readingGoal / 4)) + 1, 4);
  
  // 当前段落内已读句子数
  const readInSegment = totalReadCount % Math.ceil(readingGoal / 4);
  
  // 当前段落大小
  const currentSegmentSize = Math.min(Math.ceil(readingGoal / 4), readingGoal - (currentSegmentNum - 1) * Math.ceil(readingGoal / 4));
  
  // 段落进度百分比
  const segmentPercentage = calculateSteppedProgress(totalReadCount, readingGoal);
  
  // 阅读目标进度条宽度
  const goalProgressWidth = `${segmentPercentage}%`;

  // 段落进度条宽度
  const segmentProgressWidth = goalProgressWidth;
  
  // 苹果风格的阅读模式
  if (isReading && formattedText.length > 0) {
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
                  backgroundColor: isDark ? '#0a84ff' : '#06c',
                  borderRadius: '3px',
                  transition: 'width 0.3s ease',
                  width: goalProgressWidth
                }}
              />
            </div>
            <div style={styles.goalProgressText}>
              {calculateSessionProgress()} / {readingGoal - todayCompletedSentences} 句 (总进度: {totalReadCount} / {readingGoal} 句, 第{currentSegmentNum}段: {readInSegment} / {currentSegmentSize} 句, {segmentPercentage.toFixed(1)}%)
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
                  backgroundColor: isDark ? '#0a84ff' : '#06c',
                  width: segmentProgressWidth,
                  borderRadius: '3px',
                  transition: 'width 0.3s ease',
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
                onClick={() => adjustFontSize(-4)}
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
                fontWeight: '600',
                color: isDark ? '#f5f5f7' : '#1d1d1f',
                minWidth: '70px',
                textAlign: 'center'
              }}>
                {fontSize}px
              </div>
              
              <button 
                onClick={() => adjustFontSize(4)}
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
                阅读进度: {calculateSessionProgress()} / {readingGoal - todayCompletedSentences} 句 (总进度: {totalReadCount} / {readingGoal} 句, 第{currentSegmentNum}段: {readInSegment} / {currentSegmentSize} 句, {segmentPercentage.toFixed(1)}%)
              </div>
              
              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                {/* 添加保存句子按钮 */}
                <button
                  onClick={saveCurrentSentence}
                  disabled={showSaveConfirmation} // 保存成功时短暂禁用
                  style={{
                    border: 'none',
                    background: isDark ? '#0a84ff' : '#007aff',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '600',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {showSaveConfirmation ? '✅ 保存成功' : '保存句子'}
                </button>
                
                {/* 添加查看笔记按钮 */}
                <button
                  onClick={() => setShowNotebook(true)}
                  style={{
                    border: 'none',
                    background: isDark ? '#30d158' : '#34c759',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '600',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '14px' }}>📘</span> 
                  查看笔记
                </button>
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
                {segmentPercentage.toFixed(1)}%
              </div>
            </div>
            
            {/* 简化段落进度条设计 */}
            <div style={{
              width: '100%',
              marginBottom: '4px',
            }}>
              <div style={{
                width: '100%',
                height: '6px',
                backgroundColor: 'transparent',
                borderRadius: '3px',
                overflow: 'hidden',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`,
              }}>
                <div 
                  style={{
                    height: '100%',
                    backgroundColor: isDark ? '#0a84ff' : '#06c',
                    width: segmentProgressWidth,
                    borderRadius: '3px',
                    transition: 'width 0.3s ease, background-color 0.3s ease'
                  }}
                />
              </div>
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
            <div id={`sentence-${currentIndex}`} style={{
              transition: 'background-color 0.5s ease',
              padding: '8px',
              borderRadius: '4px'
            }}>
              {formattedText[currentIndex]}
            </div>
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
            backgroundColor: isDark ? '#0a84ff' : '#06c',
            transition: 'width 0.3s ease, background-color 0.3s ease',
            width: segmentProgressWidth,
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
        
        {/* 隐藏的文件输入框，用于上传封面图片 */}
        <input 
          type="file"
          ref={coverImageInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelected}
          accept="image/*"
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
              
              <div style={styles.gridContainer}>
                {savedTexts.map((item, index) => (
                  <div key={index} style={styles.gridItem(isDark)} onClick={() => loadSavedText(index)}> 
                    {/* === START: Cover Image Area Modification === */}
                    {/* New container div for image/placeholder, handles click */}
                    <div
                      style={{ // Style for the container based on original placeholder aspect ratio
                        width: '100%',
                        paddingTop: '140%', // Aspect ratio from original placeholder style
                        position: 'relative', // Needed for absolute positioning of children
                        overflow: 'hidden', // Hide overflow
                        cursor: 'pointer', // Indicate clickability
                        backgroundColor: isDark ? '#3a3a3c' : '#e5e5ea', // Background visible if image fails or during loading
                        borderRadius: '8px 8px 0 0', // Apply top border radius here
                        marginBottom: '0',
                      }}
                      onClick={(e) => {
                          console.log(`DEBUG: Cover container clicked for index ${index}!`); // Keep debug log temporarily
                          e.stopPropagation(); // VERY IMPORTANT: Prevent card's loadSavedText click
                          handleCoverImageClick(index, e); // Trigger the upload flow
                      }}
                    >
                      {item.coverImage ? (
                        // Display the actual image if it exists
                        <img
                          src={item.coverImage}
                          alt={item.name || 'Cover'}
                          style={{ // Style to make image fill the container
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover', // Cover the area, crop if needed
                            borderRadius: 'inherit', // Inherit border radius from parent
                          }}
                          onError={(e) => { // Optional: handle image load error
                            console.error("Error loading cover image:", item.coverImage);
                            // Optionally clear the broken image data or show placeholder
                            // e.target.style.display = 'none'; // Hide broken image icon
                          }}
                        />
                      ) : (
                        // Display the placeholder content (e.g., a plus sign) if no image
                        <div style={{ // Style for the placeholder content itself
                             position: 'absolute',
                             top: 0,
                             left: 0,
                             width: '100%',
                             height: '100%',
                             display: 'flex',
                             alignItems: 'center',
                             justifyContent: 'center',
                             // Background is handled by the parent now
                             borderRadius: 'inherit' // Inherit border radius
                         }}>
                            <span style={{ fontSize: '30px', color: isDark ? '#8e8e93' : '#6c757d', fontWeight: '300' }}>+</span>
                        </div>
                      )}
                    </div>
                    {/* === END: Cover Image Area Modification === */}

                    {/* Text Name & Meta */}
                    <div style={styles.gridItemContent}>
                        <span style={styles.gridItemTitle(isDark)} title={item.name}>{item.name}</span>
                        {/* Placeholder for Author/Tags */}
                        <div style={styles.gridItemMeta(isDark)}>
                            {/* Example Tag - replace later */}
                            <span style={styles.gridItemTag(isDark)}>待分类</span> 
                        </div>
                    </div>
                    
                    {/* Action Buttons */} 
                    <div style={styles.gridItemActions}>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            loadSavedText(index);
                            // 加载文本后切换到阅读模式
                            setTimeout(() => {
                              if (!isReading) {
                                toggleReadingMode();
                              }
                            }, 100);
                          }}
                          style={styles.gridActionButton(isDark)}
                        >
                          阅读
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSavedText(e, index); }} // Prevent item click
                          style={{...styles.gridActionButton(isDark), ...styles.deleteButton(isDark)}}
                        >
                          删除
                        </button>
                      </div>
                  </div>
                ))}
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
      </div> );
      
      {/* 搜索模态框 */}
      {isSearchModalOpen && (
        <SearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleSearch={handleSearch}
          searchResults={searchResults}
          isSearching={isSearching}
          error={error}
          isDark={isDark}
          originalIndex={searchStartIndex}
          onJumpToSentence={handleJumpToSentence}
        />
      )}
      
      {/* 笔记本模态框 */}
      {showNotebook && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: getCurrentBackgroundColor(),
          zIndex: 1000,
          overflowY: 'auto',
          padding: '20px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: isDark ? '#f5f5f7' : '#1d1d1f'
            }}>
              我的笔记本
            </div>
            <div style={{
              display: 'flex',
              gap: '10px'
            }}>
              {/* 添加导出为TXT按钮 */}
              {savedSentences.length > 0 && (
                <button
                  onClick={exportNotebookToTxt}
                  style={{
                    border: 'none',
                    backgroundColor: isDark ? '#0a84ff' : '#007aff',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '15px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <span style={{ fontSize: '14px' }}>📄</span> 
                  导出为TXT
                </button>
              )}
              <button
                onClick={() => setShowNotebook(false)}
                style={{
                  border: 'none',
                  backgroundColor: isDark ? '#1c1c1e' : '#e5e5ea',
                  color: isDark ? '#f5f5f7' : '#1d1d1f',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '15px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                关闭
              </button>
            </div>
          </div>
          
          {savedSentences.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '50vh',
              textAlign: 'center',
              color: isDark ? '#8e8e93' : '#8e8e93'
            }}>
              <div style={{fontSize: '40px', marginBottom: '20px'}}>
                📝
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '10px',
                color: isDark ? '#f5f5f7' : '#1d1d1f'
              }}>
                暂无收藏的句子
              </div>
              <div style={{fontSize: '14px'}}>
                在阅读时点击"保存句子"按钮收藏喜欢的句子
              </div>
            </div>
          ) : (
            <>
              <div style={{
                marginBottom: '20px',
                fontSize: '14px',
                color: isDark ? '#8e8e93' : '#8e8e93'
              }}>
                共 {savedSentences.length} 条收藏
              </div>
              {savedSentences.map((sentence) => {
                // 格式化日期
                const date = new Date(sentence.date);
                const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                
                return (
                  <div key={sentence.id} style={{
                    backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '16px',
                    boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{
                      fontSize: '16px',
                      lineHeight: '1.5',
                      marginBottom: '10px',
                      color: isDark ? '#f5f5f7' : '#1d1d1f'
                    }}>
                      {sentence.text}
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                      color: isDark ? '#8e8e93' : '#8e8e93'
                    }}>
                      <div>
                        来源: {sentence.source} | {formattedDate}
                        {sentence.position !== undefined && (
                          <button
                            onClick={() => jumpToSavedSentence(sentence.position, sentence.source)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: isDark ? '#0a84ff' : '#007aff',
                              cursor: 'pointer',
                              padding: '0 0 0 10px',
                              fontSize: '13px',
                              textDecoration: 'underline'
                            }}
                          >
                            查看原文
                          </button>
                        )}
                      </div>
                      <button 
                        onClick={() => deleteSavedSentence(sentence.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ff3b30',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '13px'
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
      
      {/* 顶部操作按钮 */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        display: 'flex',
        gap: '10px',
        zIndex: 100,
        backgroundColor: isDark ? 'rgba(28, 28, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)', // 半透明背景
        padding: '8px',
        borderRadius: '12px',
        backdropFilter: 'blur(10px)', // 模糊效果
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', // 轻微阴影
        alignItems: 'center' // 垂直居中对齐
      }}>
        <button
          onClick={() => adjustFontSize(-4)}
          style={{
            padding: '8px 16px',
            backgroundColor: isDark ? '#2c2c2e' : '#f0f0f0',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            color: isDark ? '#ffffff' : '#000000',
            fontWeight: '500',
            transition: 'background-color 0.2s ease' // 添加过渡效果
          }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#3a3a3c' : '#e0e0e0' }} // 悬停效果
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#2c2c2e' : '#f0f0f0' }} // 移出效果
        >
          A-
        </button>
        
        <div style={{
          minWidth: '40px', // 保证宽度
          textAlign: 'center', // 居中显示
          color: isDark ? '#ffffff' : '#000000',
          fontSize: '14px'
        }}>
          {fontSize}px
        </div>
        
        <button
          onClick={() => adjustFontSize(4)}
          style={{
            padding: '8px 16px',
            backgroundColor: isDark ? '#2c2c2e' : '#f0f0f0',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            color: isDark ? '#ffffff' : '#000000',
            fontWeight: '500',
            transition: 'background-color 0.2s ease' // 添加过渡效果
          }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#3a3a3c' : '#e0e0e0' }} // 悬停效果
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#2c2c2e' : '#f0f0f0' }} // 移出效果
        >
          A+
        </button>
        
        {/* 搜索按钮 */}
        <button
          onClick={() => {
            setSearchStartIndex(currentIndex); // 记录当前索引
            setIsSearchModalOpen(true);
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: isDark ? '#2c2c2e' : '#f0f0f0',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            color: isDark ? '#ffffff' : '#000000',
            fontWeight: '500',
            transition: 'background-color 0.2s ease' // 添加过渡效果
          }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#3a3a3c' : '#e0e0e0' }} // 悬停效果
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#2c2c2e' : '#f0f0f0' }} // 移出效果
        >
          🔍
        </button>
      </div>
      
      {/* 隐藏的文件输入框，用于上传封面图片 */}
      <input 
        type="file"
        ref={coverImageInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelected}
        accept="image/*"
      />
    </div>
  );
}
