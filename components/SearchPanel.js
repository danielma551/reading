import React, { useState } from 'react';

export default function SearchPanel({ isDark, onSelect }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setIsSearching(true);
        setError(null);

        try {
            const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (data.success) {
                setResults(data.results);
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('搜索时出现错误，请稍后重试');
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div style={{
            padding: '20px',
            backgroundColor: isDark ? '#000' : '#fff',
            height: '100%',
            overflow: 'auto'
        }}>
            <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '20px'
            }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="输入搜索内容..."
                    style={{
                        flex: 1,
                        padding: '10px 15px',
                        borderRadius: '8px',
                        border: `1px solid ${isDark ? '#333' : '#ddd'}`,
                        backgroundColor: isDark ? '#1c1c1e' : '#fff',
                        color: isDark ? '#fff' : '#000',
                        fontSize: '16px'
                    }}
                />
                <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: isDark ? '#0a84ff' : '#007aff',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '16px',
                        opacity: isSearching ? 0.7 : 1
                    }}
                >
                    {isSearching ? '搜索中...' : '搜索'}
                </button>
            </div>

            {error && (
                <div style={{
                    color: '#ff3b30',
                    marginBottom: '20px',
                    padding: '10px',
                    borderRadius: '8px',
                    backgroundColor: isDark ? '#1c1c1e' : '#ffebee'
                }}>
                    {error}
                </div>
            )}

            {results.length > 0 ? (
                <div>
                    {results.map((result, index) => (
                        <div
                            key={index}
                            onClick={() => onSelect(result)}
                            style={{
                                padding: '15px',
                                marginBottom: '15px',
                                borderRadius: '12px',
                                backgroundColor: isDark ? '#1c1c1e' : '#f5f5f7',
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                ':hover': {
                                    transform: 'scale(1.01)'
                                }
                            }}
                        >
                            <div style={{
                                fontSize: '14px',
                                color: isDark ? '#8e8e93' : '#666',
                                marginBottom: '8px'
                            }}>
                                文件: {result.path}
                            </div>
                            <div style={{
                                color: isDark ? '#fff' : '#000',
                                marginBottom: '8px'
                            }}>
                                <span>{result.context.before}</span>
                                <span style={{
                                    backgroundColor: isDark ? '#0a84ff33' : '#007aff33',
                                    padding: '0 4px',
                                    borderRadius: '4px'
                                }}>
                                    {result.context.match}
                                </span>
                                <span>{result.context.after}</span>
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: isDark ? '#8e8e93' : '#666'
                            }}>
                                相关度: {(result.score * 100).toFixed(2)}%
                            </div>
                        </div>
                    ))}
                </div>
            ) : query && !isSearching && (
                <div style={{
                    textAlign: 'center',
                    color: isDark ? '#8e8e93' : '#666',
                    padding: '40px 0'
                }}>
                    未找到相关内容
                </div>
            )}
        </div>
    );
}