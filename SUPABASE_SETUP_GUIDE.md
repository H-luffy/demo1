# Supabase 数据库集成详细步骤指南

## 📋 目录
1. [前置准备](#前置准备)
2. [第一步：创建 Supabase 项目](#第一步创建-supabase-项目)
3. [第二步：初始化数据库](#第二步初始化数据库)
4. [第三步：配置环境变量](#第三步配置环境变量)
5. [第四步：启动和测试](#第四步启动和测试)
6. [第五步：使用云同步功能](#第五步使用云同步功能)
7. [常见问题](#常见问题)

---

## 前置准备

### 必需工具
- ✅ Node.js (已安装)
- ✅ npm (已安装)
- ✅ 现代浏览器（Chrome、Firefox、Edge 等）
- ✅ Supabase 账号（免费注册）

### 已完成的准备工作
- ✅ 后端已安装 `@supabase/supabase-js`
- ✅ 前端已安装 `@supabase/supabase-js`
- ✅ 创建了 Supabase 客户端配置文件
- ✅ 添加了云同步管理组件
- ✅ 保留了所有现有本地文件存储功能

---

## 第一步：创建 Supabase 项目

### 1.1 注册账号
1. 访问 [https://supabase.com](https://supabase.com)
2. 点击 **"Start your project"** 或 **"Sign in"**
3. 选择以下任一方式注册：
   - 使用 GitHub 账号（推荐）
   - 使用 Google 账号
   - 使用邮箱注册

### 1.2 创建新项目
1. 登录后，点击 **"New Project"**
2. 填写项目信息：

   ```
   Name: schedule-template
   Database Password: YourStrongPassword123!  （请妥善保存此密码）
   Region: Asia (Singapore)  （选择最近的区域以获得更快的访问速度）
   ```

3. 点击 **"Create new project"**
4. 等待 2-3 分钟，项目初始化完成

### 1.3 获取 API 密钥
1. 项目创建完成后，进入项目 Dashboard
2. 点击左侧菜单 **Settings** → **API**
3. 复制以下信息（稍后需要配置到环境变量）：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbGciOiJIUzI1NiIsInR...`（很长的字符串）

---

## 第二步：初始化数据库

### 2.1 打开 SQL 编辑器
1. 在 Supabase Dashboard 左侧菜单点击 **SQL Editor**
2. 点击 **"New query"**

### 2.2 执行初始化脚本
1. 打开项目根目录下的 `supabase-init.sql` 文件
2. 复制全部内容
3. 粘贴到 SQL Editor 中
4. 点击 **"Run"** 按钮执行

### 2.3 验证表创建成功
执行以下 SQL 检查表是否创建成功：

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

应该看到以下表：
- `templates`
- `template_cells`
- `export_logs`

### 2.4 创建存储桶
1. 在左侧菜单点击 **Storage**
2. 应该能看到自动创建的 `template-images` 存储桶
3. 如果没有，可以手动创建：
   - 点击 **"New bucket"**
   - Name: `template-images`
   - Public bucket: ✅ 勾选
   - 点击 **"Create bucket"**

---

## 第三步：配置环境变量

### 3.1 配置后端

#### 方法一：复制示例文件（推荐）
```bash
cd backend
copy .env.example .env
```

#### 方法二：手动创建
在 `backend/` 目录下创建 `.env` 文件，内容如下：

```env
# 服务器端口
PORT=3001

# 通义千问 API 配置（如果需要使用图片风格化功能）
QWEN_API_KEY=your_qwen_api_key_here
QWEN_TEXT_MODEL=qwen-plus

# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
ENABLE_SUPABASE_SYNC=false
```

**重要**：将以下内容替换为你的实际值：
- `https://your-project.supabase.co` → 你的 Supabase Project URL
- `your_supabase_anon_key_here` → 你的 Supabase anon public key
- `ENABLE_SUPABASE_SYNC=false` → 如需启用自动同步改为 `true`

### 3.2 配置前端

#### 方法一：复制示例文件（推荐）
```bash
cd frontend
copy .env.example .env
```

#### 方法二：手动创建
在 `frontend/` 目录下创建 `.env` 文件，内容如下：

```env
# Supabase 配置
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**重要**：将以下内容替换为你的实际值：
- `https://your-project.supabase.co` → 你的 Supabase Project URL
- `your_supabase_anon_key_here` → 你的 Supabase anon public key

### 3.3 安全提示
⚠️ **重要**：`.env` 文件包含敏感信息，不应提交到 Git。确保 `.gitignore` 文件中包含：

```gitignore
.env
```

---

## 第四步：启动和测试

### 4.1 启动后端服务
```bash
cd backend
npm start
```

你应该看到类似输出：
```
✅ Supabase 客户端已初始化
   URL: https://xxxxx.supabase.co
   自动同步: 关闭
Server running at http://localhost:3001
API key configured: yes/no
```

### 4.2 启动前端服务
打开新终端：
```bash
cd frontend
npm start
```

浏览器会自动打开 `http://localhost:3000`

### 4.3 测试 Supabase 连接

#### 方法一：通过 API 测试
在浏览器中访问：
```
http://localhost:3001/api/supabase/status
```

应该返回：
```json
{
  "success": true,
  "available": true,
  "syncEnabled": false,
  "message": "Supabase 已连接但未启用自动同步"
}
```

#### 方法二：使用云同步管理组件
1. 在 React 应用中添加路由指向 `SupabaseSyncManager` 组件
2. 或使用以下方式临时测试：

在 `frontend/src/App.js` 中临时添加：
```javascript
import SupabaseSyncManager from './components/SupabaseSyncManager';

// 在适当位置渲染
<SupabaseSyncManager />
```

---

## 第五步：使用云同步功能

### 5.1 开启自动同步

#### 方法一：通过管理界面
1. 访问云同步管理组件
2. 点击 **"开启自动同步"** 按钮
3. 系统会显示成功消息

#### 方法二：修改环境变量
编辑 `backend/.env` 文件：
```env
ENABLE_SUPABASE_SYNC=true
```
然后重启后端服务。

### 5.2 手动同步模板

#### 同步单个模板
1. 在云同步管理组件中点击 **"同步单个模板"**
2. 输入模板 ID（例如：1）
3. 点击确定

#### 批量同步所有模板
1. 点击 **"批量同步所有模板"** 按钮
2. 确认操作
3. 等待同步完成，查看统计结果

### 5.3 数据流向说明

```
用户上传模板
    ↓
保存到本地 JSON (templates-data/*.json)
    ↓
如果 ENABLE_SUPABASE_SYNC=true
    ↓
同时同步到 Supabase 数据库
    ├─ templates 表（元数据）
    └─ template_cells 表（格子详情）
```

**读取优先级**：
- 默认从本地 JSON 读取（速度快）
- 可通过 `/api/supabase/templates` 查询云端数据

---

## 常见问题

### Q1: 提示 "Supabase 未配置"
**解决方案**：
1. 检查 `backend/.env` 和 `frontend/.env` 文件是否存在
2. 确认 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 已正确填写
3. 重启后端和前端服务

### Q2: 同步失败，提示连接错误
**解决方案**：
1. 检查网络连接
2. 确认 Supabase 项目处于活跃状态
3. 验证 API Key 是否正确（注意不要有多余空格）
4. 检查防火墙是否阻止了访问

### Q3: 如何禁用 Supabase？
**解决方案**：
只需不配置环境变量即可。如果不设置 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`，系统会自动回退到纯本地模式，所有功能正常工作。

### Q4: 数据会丢失吗？
**答案**：不会！
- 本地 JSON 文件始终保留
- Supabase 是可选的增强功能
- 即使 Supabase 不可用，系统仍使用本地存储正常运行

### Q5: 如何查看 Supabase 中的数据？
**解决方案**：
1. 登录 Supabase Dashboard
2. 点击左侧 **Table Editor**
3. 选择 `templates` 或 `template_cells` 表查看数据

### Q6: 多个用户可以共享模板吗？
**当前实现**：
- 所有标记为 `is_public = true` 的模板对所有用户可见
- 暂未实现用户认证和权限管理
- 如需完整的多用户支持，需要额外开发认证模块

### Q7: 性能会受影响吗？
**答案**：不会！
- 默认从本地 JSON 读取，速度与之前完全相同
- Supabase 同步在后台异步进行，不阻塞主流程
- 只有在显式调用 Supabase API 时才会访问云端

### Q8: 如何迁移现有数据到 Supabase？
**步骤**：
1. 确保 Supabase 已正确配置
2. 启动后端服务
3. 访问云同步管理组件
4. 点击 **"批量同步所有模板"**
5. 等待同步完成

---

## 🎯 下一步建议

### 可选增强功能
1. **用户认证系统**
   - 使用 Supabase Auth 实现邮箱/密码登录
   - 支持 OAuth（Google、GitHub）
   - 实现用户专属模板管理

2. **实时协作**
   - 利用 Supabase Realtime 实现多用户协同编辑
   - 实时显示其他用户的更改

3. **模板市场**
   - 公开模板浏览和下载
   - 点赞、收藏、评论功能
   - 模板分类和搜索

4. **版本控制**
   - 记录模板修改历史
   - 支持回滚到任意版本

5. **数据分析**
   - 统计模板使用次数
   - 用户行为分析
   - 热门模板排行

---

## 📞 技术支持

如遇到问题：
1. 检查控制台日志（浏览器 F12 → Console）
2. 查看后端终端输出
3. 参考 Supabase 官方文档：https://supabase.com/docs
4. 检查项目 README 和相关文档

---

## ✅ 集成检查清单

- [ ] 已创建 Supabase 项目
- [ ] 已获取 Project URL 和 Anon Key
- [ ] 已在 SQL Editor 执行初始化脚本
- [ ] 已验证数据库表创建成功
- [ ] 已配置 backend/.env 文件
- [ ] 已配置 frontend/.env 文件
- [ ] 后端服务正常启动并显示 Supabase 已连接
- [ ] 前端服务正常启动
- [ ] 访问 /api/supabase/status 返回成功
- [ ] 能够手动同步模板到 Supabase
- [ ] 能够在 Supabase Dashboard 查看同步的数据

**恭喜！🎉 Supabase 集成完成！**
