// /Users/danielma/Downloads/text/pages/api/save-uploaded-text.js
import fs from 'fs';
import path from 'path';

// 定义存储上传文件的目录
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploaded_texts');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '仅允许 POST 方法' });
  }

  try {
    const { filename, content } = req.body;

    if (!filename || typeof content !== 'string') {
      return res.status(400).json({ message: '请求体缺少 filename 或 content' });
    }

    // 清理文件名，防止路径遍历攻击
    // 移除路径分隔符和 '..'
    const safeFilename = path.basename(filename.replace(/[\/]|\.\./g, ''));
     if (!safeFilename || !safeFilename.endsWith('.txt')) {
         // 确保文件名有效且是 txt 文件
         return res.status(400).json({ message: '无效的文件名或非 .txt 文件' });
    }

    const filePath = path.join(UPLOAD_DIR, safeFilename);

    // 确保目录存在
    try {
      await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
    } catch (mkdirError) {
      console.error(`创建目录失败: ${UPLOAD_DIR}`, mkdirError);
      return res.status(500).json({ message: '服务器内部错误：无法创建存储目录' });
    }

    // 写入文件
    try {
      await fs.promises.writeFile(filePath, content, 'utf8');
      console.log(`文件已保存: ${filePath}`); // 在服务器端记录日志
      return res.status(200).json({ message: '文件保存成功', filename: safeFilename });
    } catch (writeError) {
      console.error(`写入文件失败: ${filePath}`, writeError);
      return res.status(500).json({ message: '服务器内部错误：无法写入文件' });
    }

  } catch (error) {
    console.error('处理请求时发生未知错误:', error);
    return res.status(500).json({ message: '服务器内部错误' });
  }
}
