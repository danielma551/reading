// /pages/api/append-file-content.js
import fs from 'fs';
import path from 'path';
import { IncomingForm } from 'formidable';

// 禁用默认的bodyParser，以便可以使用formidable处理文件上传
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '只支持POST请求' });
  }

  console.log('开始处理文件追加请求...');

  try {
    // 创建一个新的 formidable 实例
    const form = new IncomingForm({ 
      multiples: true,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024 // 10MB
    });

    // 将请求解析为字段和文件
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        return resolve([fields, files]);
      });
    });

    console.log('Form fields:', fields);
    console.log('Files received:', files);

    // 获取目标文件名称 (适应不同版本的 formidable)
    let targetFileName = fields.targetFileName;
    if (Array.isArray(fields.targetFileName)) {
      targetFileName = fields.targetFileName[0];
    }

    if (!targetFileName) {
      console.error('缺少目标文件名');
      return res.status(400).json({ success: false, message: '缺少目标文件名' });
    }

    // 获取上传的文件
    let uploadedFile = files.file;
    if (Array.isArray(files.file)) {
      uploadedFile = files.file[0];
    }

    if (!uploadedFile) {
      console.error('未找到上传的文件');
      return res.status(400).json({ success: false, message: '请上传一个文件' });
    }

    console.log('上传的文件名:', uploadedFile.originalFilename || uploadedFile.newFilename);

    // 获取上传文件的路径
    const filePath = uploadedFile.filepath;
    
    // 读取上传的txt文件内容
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // 文本存储目录
    const textsDir = path.join(process.cwd(), 'public', 'texts');
    
    // 确保目录存在
    if (!fs.existsSync(textsDir)) {
      fs.mkdirSync(textsDir, { recursive: true });
    }

    // 目标文件路径
    const targetFilePath = path.join(textsDir, targetFileName);
    console.log('目标文件路径:', targetFilePath);
    
    // 尝试多种可能的文件路径
    const possibleFilePaths = [
      targetFilePath,  // 原始路径
      path.join(textsDir, targetFileName.replace(/\s+/g, '')),  // 移除空格
      path.join(textsDir, targetFileName.replace(/\(|\)/g, '')),  // 移除括号
      path.join(textsDir, targetFileName.replace(/\s+/g, '').replace(/\(|\)/g, '')),  // 移除空格和括号
    ];
    
    // 如果文件名不以.txt结尾，则再添加.txt后缀的版本
    if (!targetFileName.toLowerCase().endsWith('.txt')) {
      possibleFilePaths.push(path.join(textsDir, targetFileName + '.txt'));
      possibleFilePaths.push(path.join(textsDir, targetFileName.replace(/\s+/g, '') + '.txt'));
      possibleFilePaths.push(path.join(textsDir, targetFileName.replace(/\(|\)/g, '') + '.txt'));
    }
    
    // 查找存在的文件路径
    let actualTargetFilePath = null;
    for (const possiblePath of possibleFilePaths) {
      console.log('尝试文件路径:', possiblePath);
      if (fs.existsSync(possiblePath)) {
        actualTargetFilePath = possiblePath;
        console.log('找到目标文件:', possiblePath);
        break;
      }
    }
    
    // 在texts目录中列出所有文件，以便调试
    try {
      const allFiles = fs.readdirSync(textsDir);
      console.log('所有可用的文件:', allFiles);
    } catch (err) {
      console.error('无法读取目录:', err);
    }
    
    // 如果没有找到文件路径，则创建新文件
    if (!actualTargetFilePath) {
      console.log(`目标文件 "${targetFileName}" 不存在，将创建新文件`);
      
      // 创建新的目标文件路径
      actualTargetFilePath = path.join(textsDir, targetFileName);
      
      // 初始化文件内容
      const initialContent = `文件: ${targetFileName}\n创建时间: ${new Date().toLocaleString()}\n\n`;
      
      // 创建空文件
      try {
        fs.writeFileSync(actualTargetFilePath, initialContent, 'utf8');
        console.log(`已成功创建新文件: ${actualTargetFilePath}`);
      } catch (err) {
        console.error('创建新文件时出错:', err);
        
        // 列出所有可用的文件名
        let availableFiles = [];
        try {
          availableFiles = fs.readdirSync(textsDir)
            .filter(f => f.toLowerCase().endsWith('.txt'));
        } catch (readErr) {
          console.error('无法读取目录:', readErr);
        }
        
        const filesListStr = availableFiles.length > 0 
          ? `\n\n可用的文件: ${availableFiles.join(', ')}`
          : '';
          
        return res.status(500).json({ 
          success: false, 
          message: `无法创建目标文件 "${targetFileName}"${filesListStr}`,
          error: err.message
        });
      }
    }

    // 将内容追加到目标文件
    fs.appendFileSync(actualTargetFilePath, '\n\n' + fileContent);
    const actualFileName = path.basename(actualTargetFilePath);
    console.log('内容已成功追加到文件:', actualFileName);

    // 返回完整的文件内容，以确保前端可以正确处理
    const updatedContent = fs.readFileSync(actualTargetFilePath, 'utf8');
    
    return res.status(200).json({ 
      success: true, 
      message: '内容已成功添加到文件',
      fileName: actualFileName,
      content: updatedContent // 返回更新后的完整文件内容
    });
  } catch (error) {
    console.error('处理文件追加时出错:', error);
    return res.status(500).json({ 
      success: false, 
      message: '添加内容时发生错误', 
      error: error.message 
    });
  }
}
