import { google } from 'googleapis';
import fs from 'node:fs/promises';
import path from 'node:path';

// Google Drive上传功能
export async function uploadToGoogleDrive(filePath, fileName) {
  try {
    // 从环境变量获取认证信息
    const credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!credentials || !folderId) {
      console.log('⚠️ Google Drive credentials not configured, skipping upload');
      return;
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch (error) {
      console.log(`❌ File not found: ${filePath}`);
      return;
    }

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: fs.createReadStream(filePath),
    };

    console.log(`📤 Uploading ${fileName} to Google Drive...`);
    
    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id,name,webViewLink',
    });

    console.log(`✅ File uploaded successfully!`);
    console.log(`📁 File ID: ${file.data.id}`);
    console.log(`🔗 View link: ${file.data.webViewLink}`);
    
    return file.data;
  } catch (error) {
    console.error('❌ Error uploading to Google Drive:', error.message);
    throw error;
  }
}

// 批量上传文件夹中的所有Excel文件
export async function uploadAllExcelFiles(downloadDir) {
  try {
    const files = await fs.readdir(downloadDir);
    const excelFiles = files.filter(file => 
      file.endsWith('.xlsx') || file.endsWith('.xls')
    );

    if (excelFiles.length === 0) {
      console.log('📭 No Excel files found to upload');
      return;
    }

    console.log(`📁 Found ${excelFiles.length} Excel file(s) to upload`);

    for (const file of excelFiles) {
      const filePath = path.join(downloadDir, file);
      await uploadToGoogleDrive(filePath, file);
    }

    console.log('🎉 All files uploaded successfully!');
  } catch (error) {
    console.error('❌ Error in batch upload:', error.message);
    throw error;
  }
} 