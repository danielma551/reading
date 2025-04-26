import { TextIndexer } from '../../utils/text-indexer';
import path from 'path';

// 初始化文本索引器，使用 public/texts 目录作为基础目录
const textIndexer = new TextIndexer(path.join(process.cwd(), 'public', 'texts'));

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { 
            query,
            maxResults = 10,
            fuzzyMatch = true,
            minSimilarity = 0.8
        } = req.query;

        if (!query) {
            return res.status(400).json({ message: 'Query parameter is required' });
        }

        // 扫描并更新索引
        await textIndexer.scan_files();

        // 执行搜索
        const results = textIndexer.search(
            query,
            parseInt(maxResults),
            fuzzyMatch === 'true',
            parseFloat(minSimilarity)
        );

        res.status(200).json({
            success: true,
            results: results.map(result => ({
                ...result,
                // 添加上下文信息
                context: {
                    before: result.content.substring(0, result.content.indexOf(query)),
                    match: query,
                    after: result.content.substring(result.content.indexOf(query) + query.length)
                }
            }))
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: error.message 
        });
    }
}
