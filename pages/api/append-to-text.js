// /Users/danielma/Downloads/text/pages/api/append-to-text.js
import fs from 'fs';
import path from 'path';

// 定义文本文件存储目录
const TEXTS_DIR = path.join(process.cwd(), 'public', 'texts');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '仅允许 POST 方法' });
  }

  try {
    const { filename, content, separator } = req.body;

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

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: '文件不存在' });
    }

    // 读取现有文件内容
    let existingContent;
    try {
      existingContent = await fs.promises.readFile(filePath, 'utf8');
    } catch (readError) {
      console.error(`读取文件失败: ${filePath}`, readError);
      return res.status(500).json({ message: '服务器内部错误：无法读取文件' });
    }

    // 确定分隔符
    const contentSeparator = separator || '\n\n---\n\n';

    // 追加新内容到文件
    try {
      // 如果现有内容不以换行符结束，则添加换行符
      const newContent = existingContent.endsWith('\n') 
        ? existingContent + contentSeparator + content 
        : existingContent + '\n' + contentSeparator + content;
      
      await fs.promises.writeFile(filePath, newContent, 'utf8');
      console.log(`内容已追加到文件: ${filePath}`);
      return res.status(200).json({ 
        message: '内容追加成功', 
        filename: safeFilename,
        contentLength: newContent.length
      });
    } catch (writeError) {
      console.error(`写入文件失败: ${filePath}`, writeError);
      return res.status(500).json({ message: '服务器内部错误：无法写入文件' });
    }
  } catch (error) {
    console.error('处理请求时发生未知错误:', error);
    return res.status(500).json({ message: '服务器内部错误' });
  }
}
