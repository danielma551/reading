// /pages/api/load-text-files.js
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: '只支持GET请求' });
  }

  try {
    // 获取文本文件的目录
    const textsDir = path.join(process.cwd(), 'public', 'texts');

    // 确保目录存在
    if (!fs.existsSync(textsDir)) {
      fs.mkdirSync(textsDir, { recursive: true });
      return res.status(200).json({ texts: [] });
    }

    // 读取目录中的所有文件
    const files = fs.readdirSync(textsDir)
      .filter(file => file.endsWith('.txt'));

    // 读取每个文件的内容
    const texts = await Promise.all(files.map(async (file) => {
      const filePath = path.join(textsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 获取文件创建时间
      const stats = fs.statSync(filePath);
      
      return {
        name: file,
        content,
        date: stats.mtime.toISOString()
      };
    }));

    return res.status(200).json({ 
      texts,
      message: '文件加载成功'
    });
  } catch (error) {
    console.error('加载文本文件时出错:', error);
    return res.status(500).json({ 
      message: '服务器错误，无法加载文本文件',
      error: error.message 
    });
  }
}
