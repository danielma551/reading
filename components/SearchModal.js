// components/SearchModal.js
import React, { useState, useEffect } from 'react';

const SearchModal = ({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  handleSearch,
  searchResults,
  isSearching,
  error,
  isDark, // 接收 isDark 用于主题适配
  originalIndex, // <-- 添加这行
  onJumpToSentence, // <-- 添加这行
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Use setTimeout to allow the component to render before starting the animation
      const timer = setTimeout(() => setIsAnimating(true), 10); // Small delay for transition
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false); // Reset on close
    }
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null; // Keep component mounted during closing animation if needed, but for now, instant close
  // Let's stick to instant close for simplicity first.
  if (!isOpen) return null;

  // 阻止事件冒泡，防止点击模态框内容导致关闭
  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  // 处理 Enter 键触发搜索
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 处理跳转到句子
  const handleJumpToSentence = (position) => {
    if (typeof onJumpToSentence === 'function') {
      onJumpToSentence(position);
    }
  };

  return (
    // 蒙层/遮罩层
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)', // 半透明黑色背景
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000, // 确保在顶层
        opacity: isAnimating ? 1 : 0, // Control opacity via state
        transition: 'opacity 0.25s ease-out', // Add transition for overlay
      }}
      onClick={onClose} // 点击蒙层关闭
    >
      {/* 模态框内容区域 */}
      <div
        style={{
          backgroundColor: isDark ? '#2c2c2e' : '#ffffff', // 深色/浅色背景
          color: isDark ? '#ffffff' : '#000000', // 深色/浅色文字
          padding: '25px',
          borderRadius: '10px',
          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)',
          width: '90%', // 宽度
          maxWidth: '600px', // 最大宽度
          minHeight: '400px', // 最小高度，防止内容少时太扁
          maxHeight: '80vh', // 最大高度，防止内容多时超出屏幕
          display: 'flex',
          flexDirection: 'column',
          position: 'relative', // 为了关闭按钮定位
          opacity: isAnimating ? 1 : 0, // Control opacity via state
          transform: isAnimating ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(10px)', // Control transform via state
          transition: 'opacity 0.25s ease-out, transform 0.25s ease-out', // Add transition for content
        }}
        onClick={handleContentClick} // 阻止点击内容关闭
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '15px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: isDark ? '#aaaaaa' : '#555555',
            padding: '0',
            lineHeight: '1'
          }}
          aria-label="关闭搜索框" // 增强可访问性
        >
          &times; {/* 使用 HTML 实体表示关闭图标 */}
        </button>

        <h2 style={{ marginTop: '0', marginBottom: '20px', fontSize: '20px', borderBottom: `1px solid ${isDark ? '#444' : '#eee'}`, paddingBottom: '10px' }}>
          搜索本地文本
        </h2>

        {/* 搜索输入和按钮 */}
        <div style={{ display: 'flex', marginBottom: '20px', gap: '10px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown} // 添加键盘事件监听
            placeholder="输入关键词..."
            style={{
              flexGrow: 1,
              padding: '10px 12px',
              borderRadius: '6px',
              border: `1px solid ${isDark ? '#555' : '#ccc'}`,
              backgroundColor: isDark ? '#3a3a3c' : '#fff',
              color: isDark ? '#fff' : '#000',
              fontSize: '15px'
            }}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            style={{
              padding: '10px 18px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: isDark ? '#0a84ff' : '#007aff',
              color: 'white',
              cursor: 'pointer',
              fontSize: '15px',
              opacity: isSearching ? 0.6 : 1,
            }}
          >
            {isSearching ? '搜索中...' : '搜索'}
          </button>
        </div>

        {/* 搜索结果区域 */}
        <div style={{ flexGrow: 1, overflowY: 'auto', borderTop: `1px solid ${isDark ? '#444' : '#eee'}`, paddingTop: '15px' }}>
          {error && <p style={{ color: isDark ? '#ff4d4f' : '#d93025' }}>错误: {error}</p>}
          {searchResults.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {searchResults.map((result, index) => (
                <li key={index} style={{
                  marginBottom: '12px',
                  padding: '12px',
                  backgroundColor: isDark ? '#3a3a3c' : '#f8f8f8',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}>
                  <div><strong>文档:</strong> {result.doc_id}</div>
                  {result.sentences && result.sentences.length > 0 && (
                    <div style={{
                      marginTop: '8px',
                      paddingLeft: '12px',
                      borderLeft: `3px solid ${isDark ? '#0a84ff' : '#007aff'}`, 
                      fontSize: '13px',
                      color: isDark ? '#c0c0c0' : '#444444',
                    }}>
                      {result.sentences.map((sentence, sIndex) => (
                        <p key={sIndex} style={{ 
                          margin: '4px 0', 
                          wordBreak: 'break-word', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start',
                          padding: '8px',
                          borderRadius: '4px',
                          backgroundColor: isDark ? 'rgba(10, 132, 255, 0.1)' : 'rgba(0, 122, 255, 0.05)',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s ease'
                        }}
                        onClick={() => handleJumpToSentence(sentence.position)}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = isDark ? 'rgba(10, 132, 255, 0.2)' : 'rgba(0, 122, 255, 0.1)' }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = isDark ? 'rgba(10, 132, 255, 0.1)' : 'rgba(0, 122, 255, 0.05)' }}
                        >
                          <span>{sentence.text}</span>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: isDark ? 'rgba(10, 132, 255, 0.2)' : 'rgba(0, 122, 255, 0.1)',
                              color: isDark ? '#0a84ff' : '#007aff',
                              fontSize: '12px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}>
                              第 {sentence.position + 1} 句
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleJumpToSentence(sentence.position);
                              }}
                              style={{
                                border: 'none',
                                backgroundColor: isDark ? '#0a84ff' : '#007aff',
                                color: 'white',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              跳转
                            </button>
                          </div>
                        </p>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            // 如果没有错误但结果为空，可以显示提示（可选）
            !error && !isSearching && <p style={{ color: isDark ? '#aaa' : '#666', textAlign: 'center', marginTop: '20px' }}>输入关键词开始搜索。</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
