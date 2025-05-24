// /pages/api/save-dedao-content.js
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const TEXTS_DIR = path.join(process.cwd(), 'public', 'texts');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '仅允许 POST 方法' });
  }

  try {
    const { title, content, source, appendToFile, targetFileName } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: '标题和内容不能为空' });
    }

    // 创建文件名，使用标题并添加来源标记
    const sourceTag = source ? `-${source}` : '';
    let fileName = `${title}${sourceTag}.txt`;
    
    // 确保文件名安全 (移除不安全的字符)
    fileName = fileName
      .replace(/[/\\?%*:|"<>]/g, '-')
      .trim();

    // 确保目标目录存在
    if (!fs.existsSync(TEXTS_DIR)) {
      fs.mkdirSync(TEXTS_DIR, { recursive: true });
    }

    const filePath = path.join(TEXTS_DIR, fileName);
    
    // 如果指定要追加到现有文件
    if (appendToFile && targetFileName) {
      // 确保目标文件名安全
      const safeTargetFileName = targetFileName
        .replace(/[/\?%*:|"<>]/g, '-')
        .trim();
      
      // 尝试多种可能的文件路径
      const possibleFilePaths = [
        path.join(TEXTS_DIR, safeTargetFileName),
        path.join(TEXTS_DIR, `${safeTargetFileName}.txt`),
        path.join(TEXTS_DIR, safeTargetFileName.replace('.txt', '') + '.txt')
      ];
      
      // 寻找存在的文件
      let targetFilePath = null;
      let existingFile = null;
      
      for (const filePath of possibleFilePaths) {
        if (fs.existsSync(filePath)) {
          targetFilePath = filePath;
          existingFile = path.basename(filePath);
          break;
        }
      }
      
      // 如果找到文件则追加内容
      if (targetFilePath) {
        // 读取目标文件的当前内容
        const existingContent = fs.readFileSync(targetFilePath, 'utf8');
        
        // 将新内容追加到现有内容后面
        await writeFile(targetFilePath, existingContent + '\n' + content, 'utf8');
        
        return res.status(200).json({ 
          success: true, 
          fileName: existingFile,
          message: `内容已成功追加到文件 "${existingFile}"` 
        });
      } else {
        // 如果没有找到目标文件，列出全部可用文件
        let availableFiles = [];
        try {
          availableFiles = fs.readdirSync(TEXTS_DIR)
            .filter(f => f.endsWith('.txt'))
            .map(f => `"${f}"`);
        } catch (error) {
          console.error('Error reading directory:', error);
        }
        
        const availableFilesMsg = availableFiles.length > 0 
          ? `\n可用的文件: ${availableFiles.join(', ')}` 
          : '';
        
        return res.status(404).json({ 
          success: false, 
          message: `目标文件 "${safeTargetFileName}" 不存在${availableFilesMsg}` 
        });
      }
    }
    
    // 常规逻辑：检查文件是否已存在，如果存在则添加时间戳以避免覆盖
    if (fs.existsSync(filePath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      fileName = `${title}${sourceTag}-${timestamp}.txt`;
      fileName = fileName.replace(/[/\\?%*:|"<>]/g, '-').trim();
    }
    
    const finalFilePath = path.join(TEXTS_DIR, fileName);
    
    // 写入文件
    await writeFile(finalFilePath, content, 'utf8');
    
    // 更新索引文件（如果存在）
    const indexPath = path.join(TEXTS_DIR, 'index_data.json');
    let indexData = {};
    
    if (fs.existsSync(indexPath)) {
      try {
        const indexContent = fs.readFileSync(indexPath, 'utf8');
        indexData = JSON.parse(indexContent);
      } catch (e) {
        console.error('读取索引文件失败，将创建新的索引', e);
        indexData = {};
      }
    }
    
    // 添加新文件到索引
    indexData[fileName] = {
      name: title,
      source: source || '得到',
      addedAt: new Date().toISOString()
    };
    
    // 保存更新后的索引
    await writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf8');
    
    return res.status(200).json({ 
      success: true, 
      fileName,
      message: `文件 "${fileName}" 已成功保存` 
    });
    
  } catch (error) {
    console.error('保存得到内容时出错：', error);
    return res.status(500).json({ 
      success: false,
      message: '服务器错误，无法保存内容',
      error: error.message 
    });
  }
}
