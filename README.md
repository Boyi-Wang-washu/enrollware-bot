# Enrollware Bot

自动化Enrollware数据导出机器人，支持云端部署和Google Drive存储。

## 功能特性

- 自动登录Enrollware系统
- 智能选择日期范围（最近30天）
- 自动导出学生数据到Excel
- 支持云端部署（GitHub Actions）
- 自动上传到Google Drive

## 本地运行

1. 安装依赖：
```bash
npm install
```

2. 配置环境变量：
创建 `.env` 文件：
```
EW_USER=你的用户名
EW_PASS=你的密码
```

3. 运行脚本：
```bash
npm start
```

## 云端部署

1. 将代码推送到GitHub仓库
2. 在GitHub Secrets中配置：
   - `EW_USER`: Enrollware用户名
   - `EW_PASS`: Enrollware密码
   - `GOOGLE_DRIVE_CREDENTIALS`: Google Drive API凭证
   - `GOOGLE_DRIVE_FOLDER_ID`: Google Drive文件夹ID

3. 脚本将每天自动运行并上传数据到Google Drive

## 注意事项

- 请确保账户信息安全，不要将密码提交到代码中
- 建议定期更新密码和API密钥
- 首次运行可能需要手动处理验证码 