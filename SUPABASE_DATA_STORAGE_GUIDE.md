# Supabase 数据存储配置指南

本指南将帮助您将课表模板编辑系统的数据保存到 Supabase 云端数据库。

## 目录

1. [创建 Supabase 项目](#创建-supabase-项目)
2. [初始化数据库表](#初始化数据库表)
3. [配置后端连接](#配置后端连接)
4. [测试连接](#测试连接)
5. [数据同步](#数据同步)

## 创建 Supabase 项目

1. 访问 [Supabase 官网](https://supabase.com/) 并注册/登录
2. 点击 "New Project" 创建新项目
3. 填写项目信息：
   - Name: 课表模板编辑系统（或您喜欢的名称）
   - Database Password: 设置一个强密码并妥善保存
   - Region: 选择离您最近的区域
4. 点击 "Create new project" 并等待项目创建完成（通常需要 2-3 分钟）

## 初始化数据库表

1. 在 Supabase 项目仪表板中，点击左侧菜单的 "SQL Editor"
2. 点击 "New query" 创建新查询
3. 打开项目根目录下的 `supabase-init.sql` 文件
4. 将文件内容复制并粘贴到 SQL 编辑器中
5. 点击 "Run" 执行 SQL 脚本
6. 确认所有表和策略创建成功

## 配置后端连接

1. 在 Supabase 项目仪表板中，点击左侧菜单的 "Settings" -> "API"
2. 复制以下信息：
   - Project URL（例如：https://your-project-id.supabase.co）
   - anon/public key（长字符串，以 eyJ 开头）

3. 在后端目录下创建 `.env` 文件（如果不存在）：
   ```bash
   cd backend
   cp .env.example .env
   ```

4. 编辑 `.env` 文件，填入 Supabase 凭证：
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ENABLE_SUPABASE_SYNC=true
   ADMIN_PASSWORD=your-admin-password-here
   ```

5. 保存 `.env` 文件

## 测试连接

1. 重启后端服务器：
   ```bash
   cd backend
   npm start
   ```

2. 查看控制台输出，确认看到以下信息：
   ```
   ✅ Supabase 客户端已初始化
      URL: https://your-project-id.supabase.co
      自动同步: 开启
   ```

3. 如果看到警告信息，请检查 `.env` 文件中的配置是否正确

## 数据同步

### 自动同步

当 `ENABLE_SUPABASE_SYNC=true` 时，系统会自动执行以下操作：

1. **上传模板时**：
   - 模板数据会保存到本地文件系统
   - 同时同步到 Supabase 的 `templates` 表
   - 格子数据同步到 `template_cells` 表

2. **保存模板时**：
   - 更新本地文件系统中的模板数据
   - 同时更新 Supabase 中的模板和格子数据

3. **获取模板列表时**：
   - 优先从 Supabase 获取公开模板列表
   - 如果 Supabase 没有数据，则从本地文件系统获取

4. **获取单个模板时**：
   - 优先从 Supabase 获取模板详情
   - 如果 Supabase 没有数据，则从本地文件系统获取

### 手动同步

系统还提供了手动同步的 API 端点：

```
POST /api/supabase/sync-template
```

您可以使用此端点手动触发模板同步到 Supabase。

## 数据结构

### templates 表

| 字段 | 类型 | 描述 |
|------|------|------|
| id | BIGSERIAL | 模板 ID（主键） |
| user_id | UUID | 用户 ID（外键） |
| name | VARCHAR(100) | 模板名称 |
| description | TEXT | 模板描述 |
| category | VARCHAR(50) | 模板分类 |
| image_url | VARCHAR(255) | 模板图片 URL |
| thumbnail_url | VARCHAR(255) | 缩略图 URL |
| cells_count | INTEGER | 格子数量 |
| is_public | BOOLEAN | 是否公开 |
| download_count | INTEGER | 下载次数 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### template_cells 表

| 字段 | 类型 | 描述 |
|------|------|------|
| id | BIGSERIAL | 格子 ID（主键） |
| template_id | BIGINT | 模板 ID（外键） |
| day | VARCHAR(20) | 星期几 |
| index | INTEGER | 格子索引 |
| x | DECIMAL(10,2) | X 坐标 |
| y | DECIMAL(10,2) | Y 坐标 |
| width | DECIMAL(10,2) | 宽度 |
| height | DECIMAL(10,2) | 高度 |
| font_size | INTEGER | 字体大小 |
| color | VARCHAR(20) | 字体颜色 |
| font_family | VARCHAR(50) | 字体 |
| created_at | TIMESTAMP | 创建时间 |

## 常见问题

### Q: 如何确认数据已同步到 Supabase？

A: 您可以在 Supabase 项目仪表板的 "Table Editor" 中查看 `templates` 和 `template_cells` 表，确认数据是否存在。

### Q: 如果 Supabase 连接失败怎么办？

A: 系统会自动回退到本地文件系统存储。请检查：
1. `.env` 文件中的 Supabase URL 和密钥是否正确
2. 网络连接是否正常
3. Supabase 项目是否正常运行

### Q: 如何禁用 Supabase 同步？

A: 在 `.env` 文件中设置 `ENABLE_SUPABASE_SYNC=false`，然后重启后端服务器。

### Q: 数据可以同时存储在本地和 Supabase 吗？

A: 是的，系统默认会将数据同时保存到本地文件系统和 Supabase（如果已配置并启用同步）。

## 安全建议

1. 不要将 `.env` 文件提交到版本控制系统
2. 定期更改 Supabase 数据库密码
3. 限制 Supabase API 的访问权限
4. 使用环境变量管理敏感信息
5. 定期备份 Supabase 数据库

## 下一步

配置完成后，您可以：

1. 上传第一个模板并验证数据是否同步到 Supabase
2. 在 Supabase 仪表板中查看和管理数据
3. 设置 Supabase 的 Row Level Security (RLS) 策略以控制数据访问权限
4. 配置 Supabase 的实时功能以实现多用户协作

如有任何问题，请参考 Supabase 官方文档或联系技术支持。
