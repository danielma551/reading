// /Users/danielma/Downloads/text/pages/api/append-to-text.js
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { getSession } from 'next-auth/react';
import { listFiles, uploadFile, downloadFile } from '../../lib/googleDrive';

// 定义文本文件存储目录
const TEXTS_DIR = path.join(process.cwd(), 'public', 'texts');

// 创建文件锁映射，用于防止并发写入冲突
const fileLocks = new Map();

// 检测是否在 Vercel 环境中运行
const isVercel = process.env.VERCEL === '1';

export default async function handler(req, res) {
  // 设置响应头，确保不缓存API响应
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '仅允许 POST 方法' });
  }
  
  // 如果在 Vercel 环境中，获取用户会话用于 Google Drive 操作
  let session = null;
  if (isVercel) {
    try {
      session = await getSession({ req });
      // 在生产环境中，我们暂时允许未登录用户使用追加功能
      // 注意：这是一个临时解决方案，在实际生产环境中应该要求用户登录
      if (!session) {
        console.log('用户未登录，但在生产环境中暂时允许追加内容');
        // 创建一个模拟的会话对象，使用默认的访问令牌
        session = {
          accessToken: process.env.DEFAULT_ACCESS_TOKEN || 'temporary_access_token'
        };
      }
    } catch (sessionError) {
      console.error('获取会话状态时出错:', sessionError);
      // 创建一个模拟的会话对象，使用默认的访问令牌
      session = {
        accessToken: process.env.DEFAULT_ACCESS_TOKEN || 'temporary_access_token'
      };
    }
  }

  try {
    const { filename, content, separator, title } = req.body;

    if (!filename || typeof content !== 'string') {
      return res.status(400).json({ message: '请求体缺少 filename 或 content' });
    }

    // 清理文件名，防止路径遍历攻击
    console.log('原始文件名:', filename);
    const safeFilename = path.basename(filename.replace(/[\/]|\.\./g, ''));
    console.log('处理后的文件名:', safeFilename);
    
    if (!safeFilename || !safeFilename.endsWith('.txt')) {
      // 确保文件名有效且是 txt 文件
      console.error('无效的文件名或非 .txt 文件:', safeFilename);
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

    // 在 Vercel 环境中使用 Google Drive，在本地环境使用文件系统
    if (isVercel) {
      console.log('在 Vercel 环境中使用 Google Drive');
      // 检查 Google Drive 中是否存在该文件
      try {
        const driveFiles = await listFiles(session.accessToken);
        const existingFile = driveFiles.find(file => file.name === safeFilename);
        
        if (!existingFile) {
          console.log('Google Drive 中文件不存在，将创建新文件');
          // 如果文件不存在，上传一个空文件
          await uploadFile(session.accessToken, safeFilename, '');
          console.log('成功在 Google Drive 中创建新文件:', safeFilename);
        }
      } catch (driveError) {
        console.error('Google Drive 操作失败:', driveError);
        return res.status(500).json({ message: '服务器内部错误：Google Drive 操作失败' });
      }
    } else {
      // 本地环境使用文件系统
      console.log('检查文件是否存在:', filePath);
      if (!fs.existsSync(filePath)) {
        console.log('文件不存在，将创建新文件');
        // 如果文件不存在，创建一个空文件
        try {
          fs.writeFileSync(filePath, '', 'utf8');
          console.log('成功创建新文件:', filePath);
        } catch (createError) {
          console.error('创建新文件失败:', createError);
          return res.status(500).json({ message: '服务器内部错误：无法创建文件' });
        }
      }
    }

    // 使用文件锁防止并发写入
    if (fileLocks.has(filePath)) {
      return res.status(409).json({ message: '文件正在被其他请求处理，请稍后再试' });
    }

    // 锁定文件
    fileLocks.set(filePath, true);

    try {
      // 读取现有文件内容
      let existingContent = '';
      
      if (isVercel) {
        // 在 Vercel 环境中从 Google Drive 读取文件
        try {
          const driveFiles = await listFiles(session.accessToken);
          const existingFile = driveFiles.find(file => file.name === safeFilename);
          
          if (existingFile) {
            existingContent = await downloadFile(session.accessToken, existingFile.id);
            console.log(`从 Google Drive 读取到文件内容，长度: ${existingContent.length} 字符`);
          } else {
            console.log('Google Drive 中文件为空或刚创建，使用空字符串作为现有内容');
          }
        } catch (driveReadError) {
          console.error(`从 Google Drive 读取文件失败: ${safeFilename}`, driveReadError);
          return res.status(500).json({ message: '服务器内部错误：无法从 Google Drive 读取文件' });
        }
      } else {
        // 在本地环境中从文件系统读取文件
        try {
          // 如果文件存在且有内容，读取内容
          if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
            existingContent = await fs.promises.readFile(filePath, 'utf8');
            console.log(`读取到文件内容，长度: ${existingContent.length} 字符`);
          } else {
            console.log('文件为空或刚创建，使用空字符串作为现有内容');
          }
        } catch (readError) {
          console.error(`读取文件失败: ${filePath}`, readError);
          return res.status(500).json({ message: '服务器内部错误：无法读取文件' });
        }
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
        
        if (isVercel) {
          // 在 Vercel 环境中写入 Google Drive
          await uploadFile(session.accessToken, safeFilename, newContent);
          console.log(`内容已追加到 Google Drive 文件: ${safeFilename}，新增内容长度: ${contentWithTitle.length}字符`);
        } else {
          // 在本地环境中写入文件系统
          await fs.promises.writeFile(filePath, newContent, 'utf8');
          console.log(`内容已追加到文件: ${filePath}，新增内容长度: ${contentWithTitle.length}字符`);
        }
        
        return res.status(200).json({ 
          message: '内容追加成功', 
          filename: safeFilename,
          contentLength: newContent.length,
          addedContentLength: contentWithTitle.length,
          storageType: isVercel ? 'googleDrive' : 'filesystem'
        });
      } catch (writeError) {
        console.error(`写入${isVercel ? 'Google Drive' : '文件'}失败:`, writeError);
        return res.status(500).json({ message: `服务器内部错误：无法写入${isVercel ? 'Google Drive' : '文件'}` });
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
