import { useState, useEffect } from 'react';
import { getSavedSentences, deleteSentence, clearAllSentences } from '../utils/sentence-saver';

export default function Notebook() {
  const [savedSentences, setSavedSentences] = useState([]);
  const [isDark, setIsDark] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // 初始化
  useEffect(() => {
    setIsClient(true);
    
    // 检测深色模式
    const darkModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    if (darkModeMedia.matches) {
      setIsDark(true);
    }
    
    // 加载收藏的句子
    const sentences = getSavedSentences();
    setSavedSentences(sentences);
  }, []);
  
  // 删除句子
  const handleDelete = (id) => {
    if (window.confirm('确定要删除这条收藏的句子吗？')) {
      const result = deleteSentence(id);
      if (result.success) {
        // 更新状态
        setSavedSentences(getSavedSentences());
      } else {
        alert(result.message);
      }
    }
  };
  
  // 清空所有句子
  const handleClearAll = () => {
    if (window.confirm('确定要清空所有收藏的句子吗？此操作不可撤销！')) {
      const result = clearAllSentences();
      if (result.success) {
        setSavedSentences([]);
      } else {
        alert(result.message);
      }
    }
  };
  
  // 切换深色模式
  const toggleDarkMode = () => {
    setIsDark(!isDark);
  };
  
  // 样式
  const styles = {
    container: {
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: isDark ? '#000' : '#f5f5f7',
      color: isDark ? '#f5f5f7' : '#1d1d1f'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold'
    },
    button: {
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: isDark ? '#1c1c1e' : '#e5e5ea',
      color: isDark ? '#f5f5f7' : '#1d1d1f',
      cursor: 'pointer'
    },
    sentenceCard: {
      backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
      boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
    },
    sentenceText: {
      fontSize: '16px',
      lineHeight: '1.5',
      marginBottom: '10px'
    },
    sentenceMeta: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '13px',
      color: isDark ? '#8e8e93' : '#8e8e93'
    },
    emptyState: {
      textAlign: 'center',
      marginTop: '50px',
      fontSize: '16px',
      color: isDark ? '#8e8e93' : '#8e8e93'
    }
  };
  
  // 服务器端渲染保护
  if (!isClient) {
    return <div style={styles.container}>加载中...</div>;
  }
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>我的笔记本</div>
        <div>
          <button 
            onClick={toggleDarkMode} 
            style={styles.button}
            title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
          >
            {isDark ? '🌞' : '🌙'}
          </button>
          <a href="/" style={{...styles.button, marginLeft: '10px', textDecoration: 'none'}}>
            返回首页
          </a>
          {savedSentences.length > 0 && (
            <button 
              onClick={handleClearAll} 
              style={{...styles.button, marginLeft: '10px', color: '#ff3b30'}}
            >
              清空
            </button>
          )}
        </div>
      </div>
      
      {savedSentences.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{fontSize: '40px', marginBottom: '20px'}}>
            📝
          </div>
          <div>暂无收藏的句子</div>
          <div style={{marginTop: '10px'}}>
            在阅读时点击"保存句子"按钮收藏喜欢的句子
          </div>
        </div>
      ) : (
        <>
          <div style={{marginBottom: '20px', fontSize: '14px', color: isDark ? '#8e8e93' : '#8e8e93'}}>
            共 {savedSentences.length} 条收藏
          </div>
          {savedSentences.map((sentence) => {
            // 格式化日期
            const date = new Date(sentence.date);
            const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
            
            return (
              <div key={sentence.id} style={styles.sentenceCard}>
                <div style={styles.sentenceText}>
                  {sentence.text}
                </div>
                <div style={styles.sentenceMeta}>
                  <div>来源: {sentence.source} | {formattedDate}</div>
                  <button 
                    onClick={() => handleDelete(sentence.id)}
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
  );
} 