// /pages/api/list-text-files.js
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    // 文本文件目录
    const textsDir = path.join(process.cwd(), 'public', 'texts');
    
    // 确保目录存在
    if (!fs.existsSync(textsDir)) {
      fs.mkdirSync(textsDir, { recursive: true });
      return res.status(200).json({ files: [] });
    }
    
    // 读取目录中的所有文件
    const files = fs.readdirSync(textsDir)
      .filter(file => file.endsWith('.txt'))
      .sort(); // 按字母顺序排序
    
    return res.status(200).json({
      files
    });
  } catch (error) {
    console.error('获取文件列表时出错:', error);
    return res.status(500).json({ 
      error: '服务器错误，无法获取文件列表' 
    });
  }
}
