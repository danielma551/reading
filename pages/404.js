export default function Custom404() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh', 
      fontFamily: 'system-ui', 
      padding: '0 20px' 
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
        404 - 页面未找到
      </h1>
      <p style={{ marginBottom: '2rem', textAlign: 'center' }}>
        您访问的页面不存在，请尝试返回主页。
      </p>
      <a 
        href="/"
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#007AFF',
          color: 'white',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 'bold'
        }}
      >
        返回主页
      </a>
    </div>
  );
} 