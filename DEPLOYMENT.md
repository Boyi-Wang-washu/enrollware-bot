# 部署指南

## 1. 创建GitHub仓库

1. 在GitHub上创建新仓库
2. 将本地代码推送到仓库：
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/enrollware-bot.git
git push -u origin main
```

## 2. 配置GitHub Secrets

在GitHub仓库的 Settings > Secrets and variables > Actions 中添加以下secrets：

### 必需配置
- `EW_USER`: 你的Enrollware用户名
- `EW_PASS`: 你的Enrollware密码

### Google Drive配置（可选）
- `GOOGLE_DRIVE_CREDENTIALS`: Google Drive API服务账户JSON凭证
- `GOOGLE_DRIVE_FOLDER_ID`: Google Drive目标文件夹ID

## 3. 获取Google Drive API凭证

### 3.1 创建Google Cloud项目
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Google Drive API

### 3.2 创建服务账户
1. 在IAM和管理 > 服务账户中创建新服务账户
2. 下载JSON密钥文件
3. 将JSON内容复制到 `GOOGLE_DRIVE_CREDENTIALS` secret

### 3.3 获取文件夹ID
1. 在Google Drive中创建目标文件夹
2. 从URL中获取文件夹ID（URL中的长字符串）
3. 将文件夹ID复制到 `GOOGLE_DRIVE_FOLDER_ID` secret

## 4. 测试部署

1. 在GitHub仓库的Actions页面
2. 选择"Enrollware Data Export"工作流
3. 点击"Run workflow"手动触发测试

## 5. 自动运行

配置完成后，脚本将：
- 每天凌晨2点自动运行
- 自动导出最近30天的数据
- 自动上传到Google Drive
- 发送成功/失败通知

## 6. 故障排除

### 常见问题
1. **Chrome启动失败**: 检查GitHub Actions日志中的Chrome安装步骤
2. **登录失败**: 检查用户名密码是否正确
3. **Google Drive上传失败**: 检查API凭证和文件夹ID
4. **文件下载失败**: 检查网络连接和页面结构变化

### 调试方法
1. 查看GitHub Actions运行日志
2. 手动触发工作流进行测试
3. 检查环境变量配置

## 7. 安全注意事项

- 定期更新密码和API密钥
- 不要将敏感信息提交到代码中
- 使用最小权限原则配置Google Drive API
- 监控GitHub Actions的使用量 