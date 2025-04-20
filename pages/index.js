import { useState, useEffect } from 'react';

export default function Home() {
  const [text, setText] = useState('');
  const [formattedText, setFormattedText] = useState([]);
  const [isReading, setIsReading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [fontSize, setFontSize] = useState(60);

  useEffect(() => {
    // 检测深色模式
    const darkModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    if (darkModeMedia.matches) {
      setIsDark(true);
    }

    // 设置字体大小
    function updateFontSize() {
      const width = window.innerWidth;
      if (width < 768) {
        setFontSize(36);
      } else if (width < 1024) {
        setFontSize(48);
      } else {
        setFontSize(60);
      }
    }
    
    updateFontSize();
    window.addEventListener('resize', updateFontSize);
    
    return () => {
      window.removeEventListener('resize', updateFontSize);
    };
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setText(e.target.result);
        formatText(e.target.result);
      };
      reader.readAsText(file);
    }
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

  const toggleReadingMode = () => {
    setIsReading(!isReading);
    setCurrentIndex(0);
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

  if (isReading && formattedText.length > 0) {
    // 阅读模式
    return (
      <div 
        style={{
          height: '100vh',
          width: '100vw',
          backgroundColor: isDark ? '#000' : '#fff',
          color: isDark ? '#fff' : '#000',
          overflow: 'hidden',
          position: 'relative'
        }}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') handlePrevious();
          if (e.key === 'ArrowRight') handleNext();
        }}
      >
        {/* 顶部控制栏 */}
        <div style={{
          height: '30px',
          backgroundColor: isDark ? '#222' : '#f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 10px',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          color: isDark ? '#ccc' : '#333',
          fontSize: '12px'
        }}>
          <button 
            onClick={toggleReadingMode}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: isDark ? '#ccc' : '#333',
              padding: '3px 8px',
              fontSize: '12px'
            }}
          >
            返回
          </button>
          
          <div>
            {currentIndex + 1} / {formattedText.length}
          </div>
          
          <button 
            onClick={toggleDarkMode}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: isDark ? '#ccc' : '#333',
              padding: '3px 8px',
              fontSize: '12px'
            }}
          >
            {isDark ? '浅色' : '深色'}
          </button>
        </div>

        {/* 主要内容区 */}
        <div style={{
          position: 'absolute',
          top: '30px',
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            fontSize: `${fontSize}px`,
            textAlign: 'center',
            maxWidth: '90%'
          }}>
            {formattedText[currentIndex]}
          </div>
        </div>

        {/* 左右点击区域 */}
        <div
          onClick={handlePrevious}
          style={{
            position: 'absolute',
            top: '30px',
            left: 0,
            bottom: 0,
            width: '50%',
            cursor: 'pointer'
          }}
        />
        <div
          onClick={handleNext}
          style={{
            position: 'absolute',
            top: '30px',
            right: 0,
            bottom: 0,
            width: '50%',
            cursor: 'pointer'
          }}
        />
      </div>
    );
  }

  // 上传模式
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#000' : '#fff',
      color: isDark ? '#fff' : '#000'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '0 20px'
      }}>
        <div style={{
          backgroundColor: isDark ? '#222' : '#f0f0f0',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '500',
            marginBottom: '40px',
            textAlign: 'center'
          }}>阅读器</h1>
          
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '10px',
              color: isDark ? '#ccc' : '#555'
            }}>
              选择文件
            </label>
            
            <div style={{
              position: 'relative',
              border: `2px dashed ${isDark ? '#555' : '#ddd'}`,
              backgroundColor: isDark ? '#333' : '#fff',
              borderRadius: '8px',
              padding: '24px',
              textAlign: 'center'
            }}>
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
              <div style={{
                fontSize: '14px',
                color: isDark ? '#999' : '#777'
              }}>
                拖放文件到此处，或点击选择
              </div>
            </div>
            
            {formattedText.length > 0 && (
              <button
                onClick={toggleReadingMode}
                style={{
                  width: '100%',
                  padding: '12px',
                  marginTop: '32px',
                  backgroundColor: isDark ? '#3b82f6' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                开始阅读
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 