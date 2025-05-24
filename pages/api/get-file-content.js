// /pages/api/get-file-content.js
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '只支持POST请求' });
  }

  try {
    const { fileName } = req.body;
    
    if (!fileName) {
      return res.status(400).json({
        success: false,
        message: '缺少文件名参数'
      });
    }

    // 确保文件名安全
    const safeFileName = fileName
      .replace(/\.\./g, '') // 防止目录遍历
      .replace(/[/\\?%*:|"<>]/g, '-') // 替换不安全字符;
    
    // 构建完整文件路径
    const textsDir = path.join(process.cwd(), 'public', 'texts');
    
    // 尝试多种可能的文件路径
    const possiblePaths = [
      path.join(textsDir, safeFileName),
      path.join(textsDir, safeFileName + '.txt'),
      path.join(textsDir, safeFileName.replace(/\.txt$/, '') + '.txt'),
    ];
    
    // 扫描目录中所有文件，提供更多的匹配选项
    try {
      const files = fs.readdirSync(textsDir);
      
      // 检查是否有文件名字内部包含目标文件名的子字符串（不区分大小写）
      const targetLower = safeFileName.toLowerCase();
      for (const file of files) {
        if (file.toLowerCase().includes(targetLower) || 
            targetLower.includes(file.toLowerCase())) {
          possiblePaths.push(path.join(textsDir, file));
        }
      }
      
      // 检查是否有只是格式不同的文件名 (如缺少空格或带括号的版本)
      const simpleTarget = safeFileName.replace(/\s+/g, '').replace(/[\(\)]/g, '').toLowerCase();
      for (const file of files) {
        const simpleFile = file.replace(/\s+/g, '').replace(/[\(\)]/g, '').toLowerCase();
        if (simpleFile === simpleTarget) {
          possiblePaths.push(path.join(textsDir, file));
        }
      }
    } catch (err) {
      console.error('读取目录错误:', err);
    }
    
    // 尝试查找文件
    let filePath = null;
    let fileContent = null;
    
    for (const path of [...new Set(possiblePaths)]) { // 去重
      if (fs.existsSync(path)) {
        filePath = path;
        break;
      }
    }
    
    if (!filePath) {
      return res.status(404).json({
        success: false,
        message: `找不到文件 "${safeFileName}"`
      });
    }
    
    // 读取文件内容
    try {
      fileContent = fs.readFileSync(filePath, 'utf8');
    } catch (readError) {
      return res.status(500).json({
        success: false,
        message: `读取文件 "${safeFileName}" 失败: ${readError.message}`
      });
    }
    
    return res.status(200).json({
      success: true,
      fileName: path.basename(filePath),
      content: fileContent,
      message: '文件内容获取成功'
    });
    
  } catch (error) {
    console.error('获取文件内容出错:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误，无法获取文件内容',
      error: error.message
    });
  }
}
