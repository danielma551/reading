// /Users/danielma/Downloads/text/pages/api/list-text-files.js
import fs from 'fs';
import path from 'path';

// 定义文本文件存储目录
const TEXTS_DIR = path.join(process.cwd(), 'public', 'texts');

export default async function handler(req, res) {
  // 设置响应头，确保不缓存API响应
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ message: '仅允许 GET 方法' });
  }

  try {
    // 确保目录存在
    try {
      await fs.promises.mkdir(TEXTS_DIR, { recursive: true });
    } catch (mkdirError) {
      console.error(`确保目录存在失败: ${TEXTS_DIR}`, mkdirError);
      return res.status(500).json({ message: '服务器内部错误：无法访问存储目录' });
    }

    // 读取目录中的所有文件
    const files = await fs.promises.readdir(TEXTS_DIR);
    
    // 过滤出.txt文件
    const textFiles = files.filter(file => file.toLowerCase().endsWith('.txt'));
    
    return res.status(200).json({ 
      files: textFiles,
      count: textFiles.length,
      directory: TEXTS_DIR
    });
  } catch (error) {
    console.error('获取文件列表时发生错误:', error);
    return res.status(500).json({ message: '服务器内部错误' });
  }
}
