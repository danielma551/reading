import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

/**
 * 同步按钮组件
 * @param {function} onSyncComplete - 同步完成后的回调函数
 * @returns {JSX.Element} 同步按钮组件
 */
export default function SyncButton({ onSyncComplete }) {
  const { data: session, status } = useSession();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  
  // 处理同步操作
  const handleSync = async (action = 'sync') => {
    // 检查是否已登录
    if (!session) {
      console.log('未登录，将重定向到登录页面');
      signIn('google');
      return;
    }
    
    // 检查是否有访问令牌
    if (!session.accessToken) {
      console.error('会话中缺少 accessToken，需要重新登录');
      signIn('google');
      return;
    }
    
    setIsSyncing(true);
    setSyncResult(null);
    
    try {
      // 添加调试信息
      console.log('发送同步请求，操作:', action);
      
      const response = await fetch('/api/sync-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      
      const data = await response.json();
      
      setSyncResult({
        success: response.ok,
        message: data.message,
        details: data.results,
        counts: data.counts,
      });
      
      if (response.ok && onSyncComplete) {
        onSyncComplete(data.results);
      }
    } catch (error) {
      setSyncResult({
        success: false,
        message: '同步失败: ' + error.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };
  
  return (
    <div className="sync-container" style={{
      margin: '20px 0',
      padding: '16px',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      {status === 'loading' ? (
        <div>加载中...</div>
      ) : session ? (
        <div>
          <div className="user-info" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px'
          }}>
            {session.user.image && (
              <img 
                src={session.user.image} 
                alt={session.user.name} 
                width="32" 
                height="32" 
                style={{ borderRadius: '50%' }} 
              />
            )}
            <span>{session.user.name || session.user.email}</span>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button 
              onClick={() => handleSync('sync')} 
              disabled={isSyncing}
              style={{
                backgroundColor: '#4285F4',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: isSyncing ? 0.7 : 1
              }}
            >
              {isSyncing ? (
                <>
                  <span className="spinner" style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderRadius: '50%',
                    borderTopColor: 'white',
                    animation: 'spin 1s linear infinite'
                  }}></span>
                  正在同步...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2V12M12 12L16 8M12 12L8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  同步数据
                </>
              )}
            </button>
            
            <button 
              onClick={() => handleSync('upload')} 
              disabled={isSyncing}
              style={{
                backgroundColor: '#34A853',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                opacity: isSyncing ? 0.7 : 1
              }}
            >
              仅上传
            </button>
            
            <button 
              onClick={() => handleSync('download')} 
              disabled={isSyncing}
              style={{
                backgroundColor: '#FBBC05',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                opacity: isSyncing ? 0.7 : 1
              }}
            >
              仅下载
            </button>
            
            <button 
              onClick={() => signOut()} 
              style={{
                backgroundColor: 'transparent',
                color: '#666',
                border: '1px solid #ccc',
                padding: '6px 12px',
                borderRadius: '4px',
                marginLeft: 'auto',
                cursor: 'pointer'
              }}
            >
              退出登录
            </button>
          </div>
          
          {syncResult && (
            <div className={`sync-result ${syncResult.success ? 'success' : 'error'}`} style={{
              marginTop: '12px',
              padding: '12px',
              borderRadius: '4px',
              backgroundColor: syncResult.success ? 'rgba(0, 200, 83, 0.1)' : 'rgba(255, 0, 0, 0.1)',
              color: syncResult.success ? '#00C853' : '#FF0000'
            }}>
              <p style={{ margin: '0 0 8px 0' }}>{syncResult.message}</p>
              
              {syncResult.counts && (
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                  {syncResult.counts.uploaded > 0 && <div>上传: {syncResult.counts.uploaded} 个文件</div>}
                  {syncResult.counts.downloaded > 0 && <div>下载: {syncResult.counts.downloaded} 个文件</div>}
                  {syncResult.counts.unchanged > 0 && <div>未变更: {syncResult.counts.unchanged} 个文件</div>}
                </div>
              )}
              
              {syncResult.details && (
                <div>
                  {syncResult.details.uploaded && syncResult.details.uploaded.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <strong>上传的文件:</strong>
                      <ul style={{ fontSize: '14px', margin: '4px 0' }}>
                        {syncResult.details.uploaded.map((item, index) => (
                          <li key={`uploaded-${index}`}>{item.fileName}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {syncResult.details.downloaded && syncResult.details.downloaded.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <strong>下载的文件:</strong>
                      <ul style={{ fontSize: '14px', margin: '4px 0' }}>
                        {syncResult.details.downloaded.map((item, index) => (
                          <li key={`downloaded-${index}`}>{item.fileName}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <button 
          onClick={() => signIn('google')} 
          style={{
            backgroundColor: 'white',
            color: '#444',
            border: '1px solid #ddd',
            padding: '8px 16px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          使用Google账号登录
        </button>
      )}
      
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
