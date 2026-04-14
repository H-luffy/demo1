# Vercel 部署完整指南

本指南将帮助你将前后端项目分别部署到 Vercel。

## 前置准备

1. 确保你有以下账号：
   - GitHub 账号
   - Vercel 账号（可以通过 GitHub 登录）

2. 确保你的代码已经推送到 GitHub 仓库

## 部署后端到 Vercel

### 步骤 1: 登录 Vercel

1. 访问 [Vercel](https://vercel.com)
2. 使用 GitHub 账号登录

### 步骤 2: 创建后端项目

1. 点击 "Add New..." -> "Project"
2. 在 "Import Git Repository" 中找到你的仓库
3. 点击 "Import"

### 步骤 3: 配置后端项目

1. **Project Name**: 输入项目名称（例如：schedule-template-backend）
2. **Framework Preset**: 选择 "Other"
3. **Root Directory**: 选择 `backend`
4. **Build Command**: 留空（因为我们的应用不需要构建步骤）
5. **Output Directory**: 留空

### 步骤 4: 配置后端环境变量

在 "Environment Variables" 部分添加以下环境变量（从你的 `backend/.env` 文件中复制）：

- `PORT`: 3001
- `QWEN_API_KEY`: 你的 Qwen API 密钥
- `QWEN_TEXT_MODEL`: qwen-plus
- `SUPABASE_URL`: 你的 Supabase 项目 URL
- `SUPABASE_ANON_KEY`: 你的 Supabase 匿名密钥
- `SUPABASE_SERVICE_ROLE_KEY`: 你的 Supabase 服务角色密钥
- `ENABLE_SUPABASE_SYNC`: true
- `ADMIN_PASSWORD`: 你的管理员密码

### 步骤 5: 部署后端

1. 点击 "Deploy" 按钮
2. 等待部署完成（通常需要 1-2 分钟）
3. 部署成功后，你会得到一个 URL，例如 `https://schedule-template-backend.vercel.app`
4. 记下这个 URL，稍后配置前端时需要用到

## 部署前端到 Vercel

### 步骤 1: 创建前端项目

1. 在 Vercel 控制台，点击 "Add New..." -> "Project"
2. 在 "Import Git Repository" 中找到你的仓库（与后端相同的仓库）
3. 点击 "Import"

### 步骤 2: 配置前端项目

1. **Project Name**: 输入项目名称（例如：schedule-template-frontend）
2. **Framework Preset**: 选择 "Create React App"
3. **Root Directory**: 选择 `frontend`
4. **Build Command**: `npm run build`
5. **Output Directory**: `build`

### 步骤 3: 配置前端环境变量

在 "Environment Variables" 部分添加以下环境变量：

- `REACT_APP_API_URL`: 你的后端 Vercel URL（例如：https://schedule-template-backend.vercel.app）

### 步骤 4: 部署前端

1. 点击 "Deploy" 按钮
2. 等待部署完成（通常需要 1-2 分钟）
3. 部署成功后，你会得到一个 URL，例如 `https://schedule-template-frontend.vercel.app`

## 更新后端 CORS 配置

部署前端后，你需要更新后端的 CORS 配置，添加你的前端 Vercel URL：

1. 在 `backend/server.js` 文件中，找到 CORS 配置部分（大约在第 53-61 行）
2. 在 `origin` 数组中添加你的前端 Vercel URL：

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://schedule-template-frontend.vercel.app' // 替换为你的前端 Vercel URL
  ],
  credentials: true
}));
```

3. 提交并推送更改到 GitHub
4. 在 Vercel 控制台中，后端项目会自动重新部署

## 验证部署

1. 访问你的前端 Vercel URL
2. 尝试使用应用的基本功能
3. 检查浏览器控制台是否有任何错误

## 常见问题

### 1. CORS 错误

如果你在浏览器控制台看到 CORS 错误，请确保：

- 后端的 CORS 配置中包含了你的前端 Vercel URL
- 前端的 `REACT_APP_API_URL` 环境变量设置正确

### 2. API 请求失败

如果 API 请求失败，请检查：

- 后端环境变量是否正确配置
- 前端的 `REACT_APP_API_URL` 是否指向正确的后端 URL
- 后端是否成功部署

### 3. 文件上传失败

如果文件上传失败，请检查：

- 文件大小是否超过 Vercel 的限制（最大 4.5MB）
- 后端的 multer 配置是否正确
- 是否有足够的权限访问上传目录

### 4. 环境变量不生效

如果环境变量不生效，请确保：

- 环境变量名称拼写正确（注意大小写）
- 前端环境变量以 `REACT_APP_` 开头
- 修改环境变量后重新部署项目

## 注意事项

1. **文件上传限制**: Vercel Serverless Functions 有文件大小限制（最大 4.5MB），如果你的应用需要上传大文件，可能需要考虑使用其他存储方案（如 Supabase Storage、AWS S3 等）。

2. **执行时间限制**: Vercel Serverless Functions 的最大执行时间为 60 秒（Hobby 计划）或 900 秒（Pro 计划）。如果你的应用需要长时间运行的任务，可能需要考虑使用其他方案。

3. **持久化存储**: Vercel Serverless Functions 是无状态的，不能使用本地文件系统进行持久化存储。建议使用 Supabase 或其他数据库服务来存储数据。

4. **环境变量**: 确保所有敏感信息（如 API 密钥）都通过环境变量配置，不要硬编码在代码中。

5. **更新部署**: 每次你推送代码到 GitHub，Vercel 会自动重新部署你的项目。你也可以在 Vercel 控制台手动触发重新部署。

## 下一步

部署完成后，你可以考虑：

1. 设置自定义域名
2. 配置持续集成/持续部署 (CI/CD)
3. 设置环境变量用于不同环境（开发、测试、生产）
4. 配置日志和错误监控
