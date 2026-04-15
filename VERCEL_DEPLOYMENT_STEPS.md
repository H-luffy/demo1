# Vercel 部署详细步骤指南

本指南提供了将课表模板编辑系统部署到 Vercel 的详细步骤。

## 📋 目录

1. [前置准备](#前置准备)
2. [部署后端到 Vercel](#部署后端到-vercel)
3. [部署前端到 Vercel](#部署前端到-vercel)
4. [部署后配置](#部署后配置)
5. [验证部署](#验证部署)
6. [常见问题](#常见问题)

---

## 前置准备

### 1. 准备 GitHub 仓库

确保你的代码已经推送到 GitHub 仓库：

```bash
# 初始化 Git 仓库（如果还没有）
git init

# 添加所有文件
git add .

# 提交更改
git commit -m "准备部署到 Vercel"

# 设置主分支
git branch -M main

# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/你的仓库名.git

# 推送到 GitHub
git push -u origin main
```

### 2. 准备 Vercel 账号

1. 访问 [Vercel](https://vercel.com)
2. 点击 "Sign Up" 或 "Login"
3. 选择使用 GitHub 账号登录
4. 授权 Vercel 访问你的 GitHub 仓库

### 3. 准备环境变量

确保你有以下环境变量的值：

**后端环境变量：**
- QWEN_API_KEY（通义千问 API 密钥）
- SUPABASE_SERVICE_ROLE_KEY（Supabase 服务角色密钥）
- ADMIN_PASSWORD（管理员密码）

**前端环境变量：**
- 后端部署后的 URL（部署后获取）

---

## 部署后端到 Vercel

### 步骤 1: 创建新的 Vercel 项目

1. 登录 Vercel 控制台
2. 点击右上角的 "Add New..." 按钮
3. 从下拉菜单中选择 "Project"

### 步骤 2: 导入 Git 仓库

1. 在 "Import Git Repository" 页面，找到你的项目仓库
2. 如果看不到，点击 "Adjust GitHub App Permissions" 授权 Vercel 访问
3. 点击仓库右侧的 "Import" 按钮

### 步骤 3: 配置项目设置

在项目配置页面，填写以下信息：

**基本设置：**
- **Project Name**: 输入项目名称
  - 例如：`schedule-template-backend`
  - 这个名称会成为 URL 的一部分
  - 例如：`https://schedule-template-backend.vercel.app`

- **Framework Preset**: 选择 "Other"
  - 因为这是一个 Node.js/Express 应用，不是标准框架

- **Root Directory**: 选择 `backend`
  - 点击输入框，选择 `backend` 文件夹

- **Build Command**: 留空
  - Node.js 应用不需要构建步骤

- **Output Directory**: 留空
  - 不需要输出目录

- **Install Command**: 留空或输入 `npm install`
  - Vercel 会自动运行 npm install

### 步骤 4: 配置环境变量

在 "Environment Variables" 部分，点击 "Add New" 添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| PORT | 3001 | 服务器端口 |
| QWEN_API_KEY | 你的 API 密钥 | 通义千问 API 密钥 |
| QWEN_TEXT_MODEL | qwen-plus | 文本模型 |
| SUPABASE_URL | https://cehpafitqckmzufwdqqb.supabase.co | Supabase URL |
| SUPABASE_ANON_KEY | sb_publishable_syWN0lfOcNPQ5vjSE6FAMA_lnvCWzfU | Supabase 匿名密钥 |
| SUPABASE_SERVICE_ROLE_KEY | 你的服务密钥 | Supabase 服务角色密钥 |
| ENABLE_SUPABASE_SYNC | true | 启用 Supabase 同步 |
| ADMIN_PASSWORD | 你的密码 | 管理员密码 |

**重要提示：**
- 确保环境变量名称拼写完全一致（区分大小写）
- 不要在值中添加引号
- 敏感信息（如 API 密钥）不要泄露

### 步骤 5: 部署项目

1. 检查所有配置是否正确
2. 点击页面底部的 "Deploy" 按钮
3. 等待部署完成（通常需要 1-2 分钟）
4. 部署过程中可以看到构建日志

### 步骤 6: 验证后端部署

部署成功后：

1. 你会看到部署成功的页面
2. 记录下后端 URL，例如：
   - `https://schedule-template-backend.vercel.app`
3. 点击 "Visit" 按钮访问部署的应用
4. 测试基本 API 端点是否可访问

**测试 API：**
- 访问 `https://schedule-template-backend.vercel.app/api/admin/config`
- 应该返回 JSON 响应，包含 `hasPassword` 字段

### 步骤 7: 查看部署日志

如果部署失败或需要调试：

1. 在 Vercel 控制台，进入项目页面
2. 点击 "Deployments" 标签
3. 点击最新的部署记录
4. 查看构建日志和函数日志

---

## 部署前端到 Vercel

### 步骤 1: 创建新的 Vercel 项目

1. 在 Vercel 控制台，点击 "Add New..." → "Project"
2. 在 "Import Git Repository" 中找到你的仓库（与后端相同的仓库）
3. 点击 "Import" 按钮

### 步骤 2: 配置项目设置

在项目配置页面，填写以下信息：

**基本设置：**
- **Project Name**: 输入项目名称
  - 例如：`schedule-template-frontend`
  - URL 会是：`https://schedule-template-frontend.vercel.app`

- **Framework Preset**: 选择 "Create React App"
  - Vercel 会自动检测并推荐

- **Root Directory**: 选择 `frontend`
  - 点击输入框，选择 `frontend` 文件夹

- **Build Command**: `npm run build`
  - React 应用的标准构建命令

- **Output Directory**: `build`
  - Create React App 的默认输出目录

### 步骤 3: 配置环境变量

在 "Environment Variables" 部分，添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| REACT_APP_API_URL | 你的后端 URL | 例如：https://schedule-template-backend.vercel.app |

**重要提示：**
- 确保使用完整的 URL（包含 https://）
- 不要在 URL 末尾添加斜杠
- 前端环境变量必须以 `REACT_APP_` 开头

### 步骤 4: 部署项目

1. 检查所有配置是否正确
2. 点击 "Deploy" 按钮
3. 等待部署完成（通常需要 1-2 分钟）

### 步骤 5: 验证前端部署

部署成功后：

1. 记录下前端 URL，例如：
   - `https://schedule-template-frontend.vercel.app`
2. 点击 "Visit" 按钮访问部署的应用
3. 检查页面是否正常加载
4. 打开浏览器控制台（F12），检查是否有错误

---

## 部署后配置

### 1. 更新后端 CORS 配置

部署前端后，需要更新后端的 CORS 配置，允许前端访问后端 API。

#### 步骤 1: 修改 backend/server.js

在 `backend/server.js` 文件中，找到 CORS 配置部分（大约在第 53-61 行）：

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // 部署到Vercel后，在此处添加你的前端Vercel URL
    // 例如：'https://schedule-template-frontend.vercel.app'
    // 部署后请取消注释并替换为实际的URL
    // 'https://your-frontend-url.vercel.app'
  ],
  credentials: true
}));
```

取消注释并添加你的前端 Vercel URL：

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://schedule-template-frontend.vercel.app' // 替换为你的实际 URL
  ],
  credentials: true
}));
```

#### 步骤 2: 提交并推送更改

```bash
# 添加更改
git add backend/server.js

# 提交更改
git commit -m "更新 CORS 配置，添加前端 Vercel URL"

# 推送到 GitHub
git push
```

#### 步骤 3: 等待自动重新部署

推送更改后，Vercel 会自动检测到更新并重新部署后端：
1. 在 Vercel 控制台，进入后端项目
2. 查看 "Deployments" 标签
3. 等待新的部署完成

### 2. 更新前端环境变量（如果后端 URL 变化）

如果后端 URL 发生变化，需要更新前端的环境变量：

1. 在 Vercel 控制台，进入前端项目
2. 点击 "Settings" 标签
3. 点击 "Environment Variables"
4. 找到 `REACT_APP_API_URL`
5. 更新为新的后端 URL
6. 点击 "Save"
7. 触发新的部署（点击 "Deployments" → "Redeploy"）

---

## 验证部署

### 1. 测试后端 API

使用浏览器或 API 测试工具（如 Postman）测试后端 API：

```bash
# 测试管理员配置检查
curl https://schedule-template-backend.vercel.app/api/admin/config

# 测试模板列表
curl https://schedule-template-backend.vercel.app/api/templates
```

预期响应：
```json
{
  "success": true,
  "hasPassword": true
}
```

### 2. 测试前端功能

1. 访问前端 URL
2. 测试以下功能：
   - [ ] 页面正常加载
   - [ ] 模板列表显示
   - [ ] 点击模板进入编辑器
   - [ ] 在格子中输入内容
   - [ ] 导出图片功能
   - [ ] 管理员登录
   - [ ] 上传新模板
   - [ ] 标记格子
   - [ ] 保存模板配置

### 3. 检查浏览器控制台

打开浏览器控制台（F12），检查：
- [ ] 没有控制台错误
- [ ] API 请求成功（状态码 200）
- [ ] 没有 CORS 错误
- [ ] 没有网络错误

### 4. 检查 Vercel 日志

1. 在 Vercel 控制台，进入后端项目
2. 点击 "Deployments" → 选择最新部署
3. 查看 "Build Logs" 和 "Function Logs"
4. 检查是否有错误或警告

---

## 常见问题

### 1. CORS 错误

**症状：**
浏览器控制台显示类似错误：
```
Access to XMLHttpRequest at 'https://backend-url.vercel.app/api/...' 
from origin 'https://frontend-url.vercel.app' has been blocked by CORS policy
```

**解决方案：**
1. 检查后端 CORS 配置是否包含前端 URL
2. 确认后端已重新部署
3. 检查前端 `REACT_APP_API_URL` 是否正确
4. 清除浏览器缓存并重试

### 2. API 请求失败

**症状：**
- API 请求返回 404 或 500 错误
- 前端无法加载数据

**解决方案：**
1. 检查后端环境变量是否正确配置
2. 检查前端 `REACT_APP_API_URL` 是否指向正确的后端 URL
3. 检查后端是否成功部署
4. 查看 Vercel 函数日志获取详细错误信息

### 3. 文件上传失败

**症状：**
- 上传图片时失败
- 显示文件过大错误

**解决方案：**
1. 检查文件大小是否超过 4.5MB（Vercel 限制）
2. 检查后端 multer 配置
3. 查看 Vercel 函数日志
4. 考虑使用 Supabase Storage 或其他存储方案

### 4. 环境变量不生效

**症状：**
- 功能异常
- API 连接失败
- 配置未生效

**解决方案：**
1. 确认环境变量名称拼写正确（区分大小写）
2. 确认前端环境变量以 `REACT_APP_` 开头
3. 修改环境变量后重新部署项目
4. 在 Vercel 控制台检查环境变量是否正确保存

### 5. 部署失败

**症状：**
- Vercel 部署时显示错误
- 构建日志显示失败信息

**解决方案：**
1. 查看完整的构建日志
2. 检查 package.json 中的依赖是否正确
3. 确保所有依赖都已正确安装
4. 检查代码中是否有语法错误
5. 在本地运行 `npm run build` 测试构建

---

## 下一步

部署完成后，你可以考虑：

1. **设置自定义域名**
   - 在 Vercel 控制台，点击 "Settings" → "Domains"
   - 添加你的自定义域名

2. **配置环境变量用于不同环境**
   - 开发环境
   - 测试环境
   - 生产环境

3. **设置日志和错误监控**
   - 集成 Sentry 等错误监控服务
   - 配置日志分析工具

4. **配置持续集成/持续部署 (CI/CD)**
   - 设置自动测试
   - 配置部署前检查

5. **性能优化**
   - 启用图片优化
   - 配置缓存策略
   - 使用 CDN

---

## 总结

完成以上步骤后，你的应用应该已经成功部署到 Vercel 并可以正常访问。如果遇到问题，请参考常见问题部分或查看 Vercel 文档。

祝部署顺利！🚀
