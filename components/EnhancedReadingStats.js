import React, { useState, useEffect } from 'react';
import { 
  getTodayReadingCount, 
  getWeekReadingData, 
  getTotalReadingCount,
  getReadingStats,
  getMonthReadingData
} from '../utils/reading-tracker';

/**
 * 增强版阅读统计组件 - 显示更详细的阅读数据
 */
const EnhancedReadingStats = ({ bookId, isDark }) => {
  const [activeTab, setActiveTab] = useState('today'); // 'today', 'week', 'month', 'total'
  const [readingStats, setReadingStats] = useState(null);
  const [weekData, setWeekData] = useState([]);
  const [monthData, setMonthData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 加载阅读数据
  useEffect(() => {
    if (bookId) {
      setIsLoading(true);
      
      // 获取各种阅读统计数据
      const stats = getReadingStats(bookId);
      setReadingStats(stats);
      
      // 获取周数据和月数据
      setWeekData(getWeekReadingData(bookId));
      setMonthData(getMonthReadingData(bookId));
      
      setIsLoading(false);
    }
  }, [bookId]);

  // 格式化日期显示
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 格式化时间（分钟转为小时和分钟）
  const formatDuration = (minutes) => {
    if (!minutes || minutes <= 0) return '0分钟';
    if (minutes < 60) return `${minutes}分钟`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) return `${hours}小时`;
    return `${hours}小时${remainingMinutes}分钟`;
  };

  // 计算柱状图的最大高度
  const getMaxBarHeight = (data) => {
    if (!data || data.length === 0) return 0;
    const maxCount = Math.max(...data.map(item => item.count));
    return maxCount > 0 ? maxCount : 1; // 避免除以零
  };

  // 计算阅读速度（每分钟句子数）
  const calculateReadingSpeed = () => {
    if (!readingStats) return 0;
    
    const todayData = monthData.find(d => {
      const today = new Date();
      const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      return d.date === formattedToday;
    });
    
    if (!todayData || todayData.duration <= 0) return 0;
    return Math.round((todayData.count / todayData.duration) * 10) / 10;
  };

  if (isLoading) {
    return (
      <div style={{
        backgroundColor: isDark ? '#1c1c1e' : '#f5f5f7',
        borderRadius: '12px',
        padding: '16px',
        marginTop: '15px',
        textAlign: 'center',
        color: isDark ? '#8e8e93' : '#666'
      }}>
        加载中...
      </div>
    );
  }

  if (!readingStats) {
    return (
      <div style={{
        backgroundColor: isDark ? '#1c1c1e' : '#f5f5f7',
        borderRadius: '12px',
        padding: '16px',
        marginTop: '15px',
        textAlign: 'center',
        color: isDark ? '#8e8e93' : '#666'
      }}>
        暂无阅读数据
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: isDark ? '#1c1c1e' : '#f5f5f7',
      borderRadius: '12px',
      padding: '16px',
      marginTop: '15px',
      boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.1)'
    }}>
      <h3 style={{
        margin: '0 0 15px 0',
        color: isDark ? '#ffffff' : '#000000',
        fontSize: '16px',
        fontWeight: '600'
      }}>
        阅读统计
      </h3>

      {/* 标签切换 */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${isDark ? '#333' : '#ddd'}`,
        marginBottom: '15px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        whiteSpace: 'nowrap'
      }}>
        <button
          onClick={() => setActiveTab('today')}
          style={{
            padding: '8px 12px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'today' ? `2px solid ${isDark ? '#0a84ff' : '#007aff'}` : 'none',
            color: activeTab === 'today' ? (isDark ? '#0a84ff' : '#007aff') : (isDark ? '#8e8e93' : '#666'),
            fontWeight: activeTab === 'today' ? '600' : 'normal',
            cursor: 'pointer'
          }}
        >
          今日
        </button>
        <button
          onClick={() => setActiveTab('week')}
          style={{
            padding: '8px 12px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'week' ? `2px solid ${isDark ? '#0a84ff' : '#007aff'}` : 'none',
            color: activeTab === 'week' ? (isDark ? '#0a84ff' : '#007aff') : (isDark ? '#8e8e93' : '#666'),
            fontWeight: activeTab === 'week' ? '600' : 'normal',
            cursor: 'pointer'
          }}
        >
          本周
        </button>
        <button
          onClick={() => setActiveTab('month')}
          style={{
            padding: '8px 12px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'month' ? `2px solid ${isDark ? '#0a84ff' : '#007aff'}` : 'none',
            color: activeTab === 'month' ? (isDark ? '#0a84ff' : '#007aff') : (isDark ? '#8e8e93' : '#666'),
            fontWeight: activeTab === 'month' ? '600' : 'normal',
            cursor: 'pointer'
          }}
        >
          月度
        </button>
        <button
          onClick={() => setActiveTab('total')}
          style={{
            padding: '8px 12px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'total' ? `2px solid ${isDark ? '#0a84ff' : '#007aff'}` : 'none',
            color: activeTab === 'total' ? (isDark ? '#0a84ff' : '#007aff') : (isDark ? '#8e8e93' : '#666'),
            fontWeight: activeTab === 'total' ? '600' : 'normal',
            cursor: 'pointer'
          }}
        >
          总计
        </button>
      </div>

      {/* 今日阅读统计 */}
      {activeTab === 'today' && (
        <div>
          {/* 今日阅读量 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <div style={{
              backgroundColor: isDark ? '#2c2c2e' : '#ffffff',
              borderRadius: '8px',
              padding: '12px',
              flex: '1',
              marginRight: '10px',
              textAlign: 'center',
              boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: isDark ? '#ffffff' : '#000000'
              }}>
                {getTodayReadingCount(bookId)}
              </div>
              <div style={{
                fontSize: '12px',
                color: isDark ? '#8e8e93' : '#666'
              }}>
                句子数
              </div>
            </div>
            
            <div style={{
              backgroundColor: isDark ? '#2c2c2e' : '#ffffff',
              borderRadius: '8px',
              padding: '12px',
              flex: '1',
              textAlign: 'center',
              boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: isDark ? '#ffffff' : '#000000'
              }}>
                {calculateReadingSpeed()}
              </div>
              <div style={{
                fontSize: '12px',
                color: isDark ? '#8e8e93' : '#666'
              }}>
                句/分钟
              </div>
            </div>
          </div>

          {/* 连续阅读记录 */}
          <div style={{
            backgroundColor: isDark ? '#2c2c2e' : '#ffffff',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px',
            boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{
                  fontSize: '14px',
                  color: isDark ? '#8e8e93' : '#666',
                  marginBottom: '5px'
                }}>
                  连续阅读
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: isDark ? '#ffffff' : '#000000'
                }}>
                  {readingStats.streak} 天
                </div>
              </div>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '20px',
                backgroundColor: isDark ? '#0a84ff' : '#007aff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '18px'
              }}>
                🔥
              </div>
            </div>
          </div>

          {/* 开始阅读日期 */}
          <div style={{
            backgroundColor: isDark ? '#2c2c2e' : '#ffffff',
            borderRadius: '8px',
            padding: '15px',
            boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{
              fontSize: '14px',
              color: isDark ? '#8e8e93' : '#666',
              marginBottom: '5px'
            }}>
              开始阅读于
            </div>
            <div style={{
              fontSize: '16px',
              color: isDark ? '#ffffff' : '#000000'
            }}>
              {readingStats.startDate}
            </div>
          </div>
        </div>
      )}

      {/* 周阅读统计 */}
      {activeTab === 'week' && (
        <div>
          {/* 柱状图 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            height: '150px',
            marginTop: '10px',
            marginBottom: '20px'
          }}>
            {weekData.map((item, index) => {
              const barHeight = getMaxBarHeight(weekData) === 0 
                ? 0 
                : (item.count / getMaxBarHeight(weekData)) * 100;
              
              return (
                <div key={index} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: `${100 / 7}%`
                }}>
                  <div style={{
                    width: '8px',
                    height: `${Math.max(barHeight, 5)}%`,
                    backgroundColor: isDark ? '#0a84ff' : '#007aff',
                    borderRadius: '4px',
                    marginBottom: '8px'
                  }} />
                  <div style={{
                    fontSize: '10px',
                    color: isDark ? '#8e8e93' : '#666',
                    textAlign: 'center'
                  }}>
                    {formatDate(item.date)}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: isDark ? '#ffffff' : '#000000',
                    textAlign: 'center',
                    marginTop: '4px'
                  }}>
                    {item.count}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 周统计概览 */}
          <div style={{
            backgroundColor: isDark ? '#2c2c2e' : '#ffffff',
            borderRadius: '8px',
            padding: '15px',
            boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '15px'
            }}>
              <div>
                <div style={{
                  fontSize: '12px',
                  color: isDark ? '#8e8e93' : '#666',
                  marginBottom: '3px'
                }}>
                  本周阅读总量
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: isDark ? '#ffffff' : '#000000'
                }}>
                  {weekData.reduce((sum, item) => sum + item.count, 0)}句
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: '12px',
                  color: isDark ? '#8e8e93' : '#666',
                  marginBottom: '3px'
                }}>
                  日均阅读量
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: isDark ? '#ffffff' : '#000000'
                }}>
                  {Math.round(weekData.reduce((sum, item) => sum + item.count, 0) / 7)}句
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: '12px',
                  color: isDark ? '#8e8e93' : '#666',
                  marginBottom: '3px'
                }}>
                  阅读天数
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: isDark ? '#ffffff' : '#000000'
                }}>
                  {weekData.filter(item => item.count > 0).length}天
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 月度阅读统计 */}
      {activeTab === 'month' && (
        <div>
          {/* 阅读热图 */}
          <div style={{
            marginBottom: '20px'
          }}>
            <div style={{
              fontSize: '14px',
              color: isDark ? '#8e8e93' : '#666',
              marginBottom: '10px'
            }}>
              本月阅读热图
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '3px'
            }}>
              {monthData.map((day, index) => {
                // 计算颜色强度
                let intensity = 0;
                if (day.count > 0) {
                  const maxCount = getMaxBarHeight(monthData);
                  intensity = Math.ceil((day.count / maxCount) * 4); // 0-4 强度
                }
                
                // 根据强度设置颜色
                const getColor = () => {
                  if (intensity === 0) return isDark ? '#2c2c2e' : '#f0f0f0';
                  if (intensity === 1) return isDark ? '#0a3b56' : '#c6e5ff';
                  if (intensity === 2) return isDark ? '#0a5477' : '#90cbff';
                  if (intensity === 3) return isDark ? '#0a6d98' : '#5ab0ff';
                  return isDark ? '#0a84ff' : '#007aff';
                };
                
                return (
                  <div 
                    key={index}
                    style={{
                      width: '12px',
                      height: '12px',
                      backgroundColor: getColor(),
                      borderRadius: '2px',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    title={`${day.date}: ${day.count}句`}
                  />
                );
              })}
            </div>
          </div>
          
          {/* 月度统计概览 */}
          <div style={{
            backgroundColor: isDark ? '#2c2c2e' : '#ffffff',
            borderRadius: '8px',
            padding: '15px',
            boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '15px'
            }}>
              <div>
                <div style={{
                  fontSize: '12px',
                  color: isDark ? '#8e8e93' : '#666',
                  marginBottom: '3px'
                }}>
                  本月阅读总量
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: isDark ? '#ffffff' : '#000000'
                }}>
                  {monthData.reduce((sum, item) => sum + item.count, 0)}句
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: '12px',
                  color: isDark ? '#8e8e93' : '#666',
                  marginBottom: '3px'
                }}>
                  日均阅读量
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: isDark ? '#ffffff' : '#000000'
                }}>
                  {Math.round(monthData.reduce((sum, item) => sum + item.count, 0) / 
                    (monthData.filter(item => 
                      new Date(item.date) <= new Date()).length || 1)
                  )}句
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: '12px',
                  color: isDark ? '#8e8e93' : '#666',
                  marginBottom: '3px'
                }}>
                  阅读天数
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: isDark ? '#ffffff' : '#000000'
                }}>
                  {monthData.filter(item => item.count > 0).length}天
                </div>
              </div>
            </div>
            
            <div>
              <div style={{
                fontSize: '12px',
                color: isDark ? '#8e8e93' : '#666',
                marginBottom: '3px'
              }}>
                本月阅读时长
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: isDark ? '#ffffff' : '#000000'
              }}>
                {formatDuration(monthData.reduce((sum, item) => sum + (item.duration || 0), 0))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 总计阅读统计 */}
      {activeTab === 'total' && (
        <div>
          {/* 总阅读量 */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <div style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: isDark ? '#ffffff' : '#000000'
            }}>
              {readingStats.totalReadCount}
            </div>
            <div style={{
              fontSize: '14px',
              color: isDark ? '#8e8e93' : '#666'
            }}>
              总共已阅读句子数
            </div>
          </div>

          {/* 其他总体统计 */}
          <div style={{
            backgroundColor: isDark ? '#2c2c2e' : '#ffffff',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '15px',
            boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '15px'
            }}>
              <div>
                <div style={{
                  fontSize: '12px',
                  color: isDark ? '#8e8e93' : '#666',
                  marginBottom: '3px'
                }}>
                  阅读天数
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: isDark ? '#ffffff' : '#000000'
                }}>
                  {readingStats.totalDays}天
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: '12px',
                  color: isDark ? '#8e8e93' : '#666',
                  marginBottom: '3px'
                }}>
                  日均阅读
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: isDark ? '#ffffff' : '#000000'
                }}>
                  {readingStats.averageDaily}句
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: '12px',
                  color: isDark ? '#8e8e93' : '#666',
                  marginBottom: '3px'
                }}>
                  连续记录
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: isDark ? '#ffffff' : '#000000'
                }}>
                  {readingStats.streak}天
                </div>
              </div>
            </div>
          </div>
          
          {/* 进度条 */}
          <div style={{
            backgroundColor: isDark ? '#2c2c2e' : '#ffffff',
            borderRadius: '8px',
            padding: '15px',
            boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{
              fontSize: '14px',
              color: isDark ? '#8e8e93' : '#666',
              marginBottom: '10px'
            }}>
              总阅读进度
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: isDark ? '#444' : '#e0e0e0',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '10px'
            }}>
              <div style={{
                width: `${Math.min((readingStats.lastPosition / Math.max(readingStats.lastPosition + 100, 1000)) * 100, 100)}%`,
                height: '100%',
                backgroundColor: isDark ? '#0a84ff' : '#007aff',
                borderRadius: '4px'
              }} />
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <div style={{
                fontSize: '12px',
                color: isDark ? '#8e8e93' : '#666'
              }}>
                位置 {readingStats.lastPosition}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedReadingStats;
