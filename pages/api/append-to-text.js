// /Users/danielma/Downloads/text/pages/api/append-to-text.js
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// 定义文本文件存储目录
const TEXTS_DIR = path.join(process.cwd(), 'public', 'texts');

// 创建文件锁映射，用于防止并发写入冲突
const fileLocks = new Map();

export default async function handler(req, res) {
  // 设置响应头，确保不缓存API响应
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '仅允许 POST 方法' });
  }

  try {
    const { filename, content, separator, title } = req.body;

    if (!filename || typeof content !== 'string') {
      return res.status(400).json({ message: '请求体缺少 filename 或 content' });
    }

    // 清理文件名，防止路径遍历攻击
    const safeFilename = path.basename(filename.replace(/[\/]|\.\./g, ''));
    if (!safeFilename || !safeFilename.endsWith('.txt')) {
      // 确保文件名有效且是 txt 文件
      return res.status(400).json({ message: '无效的文件名或非 .txt 文件' });
    }

    const filePath = path.join(TEXTS_DIR, safeFilename);

    // 确保目录存在
    try {
      await fs.promises.mkdir(TEXTS_DIR, { recursive: true });
    } catch (mkdirError) {
      console.error(`确保目录存在失败: ${TEXTS_DIR}`, mkdirError);
      return res.status(500).json({ message: '服务器内部错误：无法访问存储目录' });
    }

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: '文件不存在' });
    }

    // 使用文件锁防止并发写入
    if (fileLocks.has(filePath)) {
      return res.status(409).json({ message: '文件正在被其他请求处理，请稍后再试' });
    }

    // 锁定文件
    fileLocks.set(filePath, true);

    try {
      // 读取现有文件内容
      let existingContent;
      try {
        existingContent = await fs.promises.readFile(filePath, 'utf8');
      } catch (readError) {
        console.error(`读取文件失败: ${filePath}`, readError);
        return res.status(500).json({ message: '服务器内部错误：无法读取文件' });
      }

      // 准备要追加的内容
      // 确定分隔符
      const contentSeparator = separator || '\n\n---\n\n';
      
      // 如果提供了标题，添加到内容前面
      const contentWithTitle = title 
        ? `【${title}】\n\n${content}` 
        : content;

      // 追加新内容到文件
      try {
        // 如果现有内容不以换行符结束，则添加换行符
        const newContent = existingContent.endsWith('\n') 
          ? existingContent + contentSeparator + contentWithTitle 
          : existingContent + '\n' + contentSeparator + contentWithTitle;
        
        // 写入文件
        await fs.promises.writeFile(filePath, newContent, 'utf8');
        
        console.log(`内容已追加到文件: ${filePath}，新增内容长度: ${contentWithTitle.length}字符`);
        
        return res.status(200).json({ 
          message: '内容追加成功', 
          filename: safeFilename,
          contentLength: newContent.length,
          addedContentLength: contentWithTitle.length
        });
      } catch (writeError) {
        console.error(`写入文件失败: ${filePath}`, writeError);
        return res.status(500).json({ message: '服务器内部错误：无法写入文件' });
      }
    } finally {
      // 无论成功或失败，都释放文件锁
      fileLocks.delete(filePath);
    }
  } catch (error) {
    console.error('处理请求时发生未知错误:', error);
    return res.status(500).json({ message: '服务器内部错误' });
  }
}
