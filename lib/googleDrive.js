import { google } from 'googleapis';

/**
 * 获取Google Drive客户端
 * @param {string} accessToken - 用户的访问令牌
 * @returns {object} Google Drive客户端
 */
export async function getGoogleDriveClient(accessToken) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  
  return google.drive({ version: 'v3', auth });
}

/**
 * 列出Google Drive中的文件
 * @param {string} accessToken - 用户的访问令牌
 * @param {string} folderId - 可选的文件夹ID，如果提供则只列出该文件夹中的文件
 * @returns {Array} 文件列表
 */
export async function listFiles(accessToken, folderId = null) {
  const drive = await getGoogleDriveClient(accessToken);
  
  let query = "mimeType='text/plain' or name contains '.txt'";
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }
  query += " and trashed = false";
  
  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name, mimeType, modifiedTime)',
    spaces: 'drive',
  });
  
  return response.data.files;
}

/**
 * 上传文件到Google Drive
 * @param {string} accessToken - 用户的访问令牌
 * @param {string} fileName - 文件名
 * @param {string} content - 文件内容
 * @param {string} folderId - 可选的文件夹ID
 * @returns {string} 上传的文件ID
 */
export async function uploadFile(accessToken, fileName, content, folderId = null) {
  const drive = await getGoogleDriveClient(accessToken);
  
  // 检查文件是否已存在
  let query = `name = '${fileName}' and (mimeType='text/plain' or name contains '.txt')`;
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }
  query += " and trashed = false";
  
  const existingFiles = await drive.files.list({
    q: query,
    fields: 'files(id)',
  });
  
  const fileMetadata = {
    name: fileName,
  };
  
  if (folderId) {
    fileMetadata.parents = [folderId];
  }
  
  const media = {
    mimeType: 'text/plain',
    body: content,
  };
  
  if (existingFiles.data.files.length > 0) {
    // 更新现有文件
    const fileId = existingFiles.data.files[0].id;
    await drive.files.update({
      fileId,
      media,
    });
    return fileId;
  } else {
    // 创建新文件
    const response = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id',
    });
    return response.data.id;
  }
}

/**
 * 从Google Drive下载文件
 * @param {string} accessToken - 用户的访问令牌
 * @param {string} fileId - 文件ID
 * @returns {string} 文件内容
 */
export async function downloadFile(accessToken, fileId) {
  const drive = await getGoogleDriveClient(accessToken);
  const response = await drive.files.get({
    fileId,
    alt: 'media',
  });
  
  return response.data;
}

/**
 * 创建文件夹
 * @param {string} accessToken - 用户的访问令牌
 * @param {string} folderName - 文件夹名称
 * @param {string} parentFolderId - 可选的父文件夹ID
 * @returns {string} 创建的文件夹ID
 */
export async function createFolder(accessToken, folderName, parentFolderId = null) {
  const drive = await getGoogleDriveClient(accessToken);
  
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  
  if (parentFolderId) {
    fileMetadata.parents = [parentFolderId];
  }
  
  const response = await drive.files.create({
    resource: fileMetadata,
    fields: 'id',
  });
  
  return response.data.id;
}
