import { getSession } from 'next-auth/react';
import fs from 'fs';
import path from 'path';
import { listFiles, uploadFile, downloadFile } from '../../lib/googleDrive';

// 定义文本文件存储目录
const TEXTS_DIR = path.join(process.cwd(), 'public', 'texts');

export default async function handler(req, res) {
  // 设置响应头，确保不缓存API响应
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // 获取用户会话
  const session = await getSession({ req });
  
  // 检查是否在 Vercel 环境中运行
  const isVercelEnv = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  
  if (!session) {
    // 在生产环境中返回未授权错误
    return res.status(401).json({ 
      message: '未授权，请先登录',
      env: isVercelEnv ? 'production' : 'development'
    });
  }
  
  // 确保 session 包含 accessToken
  if (!session.accessToken) {
    console.error('会话中缺少 accessToken');
    return res.status(401).json({ 
      message: '会话信息不完整，请重新登录',
      env: isVercelEnv ? 'production' : 'development'
    });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '仅允许 POST 方法' });
  }
  
  try {
    const { action } = req.body;
    
    // 确保目录存在
    if (!fs.existsSync(TEXTS_DIR)) {
      fs.mkdirSync(TEXTS_DIR, { recursive: true });
    }
    
    // 上传本地文件到Google Drive
    if (action === 'upload') {
      const localFiles = fs.readdirSync(TEXTS_DIR).filter(file => file.endsWith('.txt'));
      
      const results = [];
      for (const fileName of localFiles) {
        const filePath = path.join(TEXTS_DIR, fileName);
        const content = fs.readFileSync(filePath, 'utf8');
        const fileId = await uploadFile(session.accessToken, fileName, content);
        results.push({ fileName, fileId, status: 'uploaded' });
      }
      
      return res.status(200).json({ 
        message: '上传成功', 
        results,
        count: results.length
      });
    } 
    // 从Google Drive下载文件到本地
    else if (action === 'download') {
      const driveFiles = await listFiles(session.accessToken);
      
      const results = [];
      for (const file of driveFiles) {
        if (file.mimeType === 'text/plain' || file.name.endsWith('.txt')) {
          const content = await downloadFile(session.accessToken, file.id);
          const filePath = path.join(TEXTS_DIR, file.name);
          fs.writeFileSync(filePath, content);
          results.push({ fileName: file.name, fileId: file.id, status: 'downloaded' });
        }
      }
      
      return res.status(200).json({ 
        message: '下载成功', 
        results,
        count: results.length
      });
    }
    // 双向同步（更复杂的逻辑，比较修改时间等）
    else if (action === 'sync') {
      const driveFiles = await listFiles(session.accessToken);
      const localFiles = fs.readdirSync(TEXTS_DIR).filter(file => file.endsWith('.txt'));
      
      const results = {
        uploaded: [],
        downloaded: [],
        unchanged: []
      };
      
      // 处理本地文件
      for (const fileName of localFiles) {
        const filePath = path.join(TEXTS_DIR, fileName);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // 检查是否在云端存在
        const driveFile = driveFiles.find(f => f.name === fileName);
        
        if (driveFile) {
          // 文件在云端存在，比较修改时间
          const localModified = fs.statSync(filePath).mtime;
          const driveModified = new Date(driveFile.modifiedTime);
          
          if (localModified > driveModified) {
            // 本地版本更新，上传到云端
            await uploadFile(session.accessToken, fileName, content);
            results.uploaded.push({ fileName, status: 'uploaded' });
          } else if (driveModified > localModified) {
            // 云端版本更新，下载到本地
            const driveContent = await downloadFile(session.accessToken, driveFile.id);
            fs.writeFileSync(filePath, driveContent);
            results.downloaded.push({ fileName, status: 'downloaded' });
          } else {
            // 文件未修改
            results.unchanged.push({ fileName, status: 'unchanged' });
          }
        } else {
          // 文件在云端不存在，上传
          await uploadFile(session.accessToken, fileName, content);
          results.uploaded.push({ fileName, status: 'uploaded' });
        }
      }
      
      // 处理云端文件
      for (const driveFile of driveFiles) {
        if ((driveFile.mimeType === 'text/plain' || driveFile.name.endsWith('.txt')) && 
            !localFiles.includes(driveFile.name)) {
          // 本地不存在的云端文件，下载
          const content = await downloadFile(session.accessToken, driveFile.id);
          const filePath = path.join(TEXTS_DIR, driveFile.name);
          fs.writeFileSync(filePath, content);
          results.downloaded.push({ fileName: driveFile.name, status: 'downloaded' });
        }
      }
      
      return res.status(200).json({ 
        message: '同步成功', 
        results,
        counts: {
          uploaded: results.uploaded.length,
          downloaded: results.downloaded.length,
          unchanged: results.unchanged.length,
          total: results.uploaded.length + results.downloaded.length + results.unchanged.length
        }
      });
    }
    
    return res.status(400).json({ message: '无效的操作' });
  } catch (error) {
    console.error('同步文件时出错:', error);
    return res.status(500).json({ 
      message: '服务器内部错误', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
