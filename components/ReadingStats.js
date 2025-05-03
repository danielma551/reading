import React, { useState, useEffect } from 'react';
import { getTodayReadingCount, getWeekReadingData, getTotalReadingCount } from '../utils/reading-tracker';

const ReadingStats = ({ bookId, isDark }) => {
  const [todayCount, setTodayCount] = useState(0);
  const [weekData, setWeekData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState('today'); // 'today', 'week', 'total'

  // 加载阅读数据
  useEffect(() => {
    if (bookId) {
      setTodayCount(getTodayReadingCount(bookId));
      setWeekData(getWeekReadingData(bookId));
      setTotalCount(getTotalReadingCount(bookId));
    }
  }, [bookId]);

  // 获取日期显示
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 计算柱状图的最大高度
  const getMaxBarHeight = () => {
    if (weekData.length === 0) return 0;
    const maxCount = Math.max(...weekData.map(item => item.count));
    return maxCount > 0 ? maxCount : 1; // 避免除以零
  };

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
        marginBottom: '15px'
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

      {/* 今日阅读量 */}
      {activeTab === 'today' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '120px'
        }}>
          <div style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: isDark ? '#ffffff' : '#000000'
          }}>
            {todayCount}
          </div>
          <div style={{
            fontSize: '14px',
            color: isDark ? '#8e8e93' : '#666'
          }}>
            今日已阅读句子数
          </div>
        </div>
      )}

      {/* 周阅读统计 */}
      {activeTab === 'week' && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          height: '150px',
          marginTop: '10px'
        }}>
          {weekData.map((item, index) => {
            const barHeight = getMaxBarHeight() === 0 
              ? 0 
              : (item.count / getMaxBarHeight()) * 100;
            
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
      )}

      {/* 总阅读量 */}
      {activeTab === 'total' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '120px'
        }}>
          <div style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: isDark ? '#ffffff' : '#000000'
          }}>
            {totalCount}
          </div>
          <div style={{
            fontSize: '14px',
            color: isDark ? '#8e8e93' : '#666'
          }}>
            总共已阅读句子数
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingStats;
