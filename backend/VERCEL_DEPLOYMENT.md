# 部署后端到 Vercel

## 前置要求

1. 确保你已经有一个 Vercel 账号
2. 确保你的代码已经推送到 GitHub 仓库

## 部署步骤

### 1. 登录 Vercel

1. 访问 [Vercel](https://vercel.com)
2. 使用 GitHub 账号登录

### 2. 创建新项目

1. 点击 "Add New..." -> "Project"
2. 在 "Import Git Repository" 中找到你的仓库 `H-luffy/demo1`
3. 点击 "Import"

### 3. 配置项目

1. **Framework Preset**: 选择 "Other"
2. **Root Directory**: 选择 `backend`
3. **Build Command**: 留空（因为我们的应用不需要构建步骤）
4. **Output Directory**: 留空

### 4. 配置环境变量

在 "Environment Variables" 部分添加以下环境变量（从你的 `backend/.env` 文件中复制）：

- `QWEN_API_KEY`: 你的 Qwen API 密钥
- `QWEN_TEXT_MODEL`: Qwen 文本模型（例如：qwen-plus）
- `ADMIN_PASSWORD`: 管理员密码
- `SUPABASE_URL`: Supabase 项目 URL（可选）
- `SUPABASE_ANON_KEY`: Supabase 匿名密钥（可选）
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase 服务角色密钥（可选）
- `ENABLE_SUPABASE_SYNC`: 是否启用 Supabase 同步（true/false，可选）

### 5. 部署

1. 点击 "Deploy" 按钮
2. 等待部署完成（通常需要 1-2 分钟）
3. 部署成功后，你会得到一个 URL，例如 `https://your-backend.vercel.app`

### 6. 更新前端配置

部署完成后，你需要更新前端的 API URL：

1. 在 Vercel 前端项目中，找到 "Environment Variables"
2. 更新 `REACT_APP_API_URL` 为你的后端 Vercel URL
3. 重新部署前端项目

### 7. 更新后端 CORS 配置

部署后端后，你需要更新 `server.js` 中的 CORS 配置，添加你的前端 Vercel URL：

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://your-frontend.vercel.app' // 替换为你的前端 Vercel URL
  ],
  credentials: true
}));
```

更新后，重新部署后端项目。

## 注意事项

1. **文件上传限制**: Vercel Serverless Functions 有文件大小限制（最大 4.5MB），如果你的应用需要上传大文件，可能需要考虑使用其他存储方案（如 Supabase Storage、AWS S3 等）。

2. **执行时间限制**: Vercel Serverless Functions 的最大执行时间为 60 秒（Hobby 计划）或 900 秒（Pro 计划）。如果你的应用需要长时间运行的任务，可能需要考虑使用其他方案。

3. **持久化存储**: Vercel Serverless Functions 是无状态的，不能使用本地文件系统进行持久化存储。建议使用 Supabase 或其他数据库服务来存储数据。

4. **环境变量**: 确保所有敏感信息（如 API 密钥）都通过环境变量配置，不要硬编码在代码中。

## 故障排除

### 部署失败

如果部署失败，请检查：

1. `vercel.json` 文件是否正确配置
2. `server.js` 文件是否正确导出了 Express 应用
3. 所有依赖是否都在 `package.json` 中列出

### API 请求失败

如果 API 请求失败，请检查：

1. CORS 配置是否正确
2. 环境变量是否正确配置
3. 前端的 API URL 是否正确

### 文件上传失败

如果文件上传失败，请检查：

1. 文件大小是否超过 Vercel 的限制
2. `multer` 配置是否正确
3. 是否有足够的权限访问上传目录
