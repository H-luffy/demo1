## 安装和运行

### 快速启动（推荐）

Windows 用户可以直接运行快速启动脚本：

```powershell
.\start-with-admin.ps1
```

该脚本会自动：
- 检测管理员密码配置
- 同时启动后端和前端服务
- 显示访问地址和使用说明

### 手动启动

#### 后端设置

1. 进入后端目录：
```bash
cd backend
```

2. 安装依赖：
```bash
npm install
```

3. 配置环境变量：
编辑 `.env` 文件，设置管理员密码：
```bash
ADMIN_PASSWORD=your_secure_password
```

4. 启动服务器：
```bash
npm start
```

服务器将在 http://localhost:3001 运行

#### 前端设置

1. 进入前端目录：
```bash
cd frontend
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm start
```

应用将在 http://localhost:3000 运行

## 使用说明

### 🔐 管理员操作流程

1. **配置密码**（首次使用）：
   - 编辑 `backend/.env` 文件
   - 设置 `ADMIN_PASSWORD=你的密码`
   - 重启后端服务

2. **进入管理模式**：
   - 访问 http://localhost:3000
   - 点击右上角 **"🔑 管理模式"** 按钮
   - 输入管理员密码
   - 点击确认

3. **管理模板**：
   - 导航栏出现 **"管理"** 链接
   - 点击进入模板管理页面
   - 上传新模板、标记格子、保存配置

4. **退出管理模式**：
   - 点击右上角 **"退出管理"** 按钮
   - 恢复为普通用户身份

### 👤 普通用户操作流程

1. 访问 http://localhost:3000
2. 直接浏览模板列表（无需登录）
3. 选择模板进行编辑
4. 在格子中输入课程内容
5. 点击"导出图片"按钮下载课表

### 📝 详细操作指南

#### 管理员：创建新模板

1. 进入管理模式后，点击导航栏的 **"管理"**
2. 点击 **"上传新模板"** 按钮，选择课表模板图片
3. （可选）输入模板名称，默认使用文件名
4. 图片上传后，点击 **"标记模式"** 按钮
5. 在下拉菜单中选择星期（周一到周五）
6. 设置节次索引（0-7）
7. 在图片上拖拽鼠标创建格子区域
8. 重复步骤 5-7，标记所有格子
9. 点击 **"保存配置"** 按钮保存模板
10. 可以复制已有格子的属性快速创建相似格子

#### 用户：编辑课表

1. 在首页模板列表中选择要使用的模板
2. 点击 **"编辑课表"** 按钮
3. 在格子中直接输入课程内容
4. 可以使用 Ctrl+C / Ctrl+V 复制粘贴格子内容
5. 点击 **"导出图片"** 按钮下载课表

## API 接口

### 🔐 管理员认证 API

#### POST /api/admin/verify
验证管理员密码

**请求参数：**
```json
{
  "password": "admin123456"
}
```

**成功响应：**
```json
{
  "success": true,
  "message": "验证成功，管理员模式已启用"
}
```

**失败响应：**
```json
{
  "success": false,
  "error": "密码错误"
}
```

#### GET /api/admin/config
检查是否配置了管理员密码

**响应：**
```json
{
  "success": true,
  "hasPassword": true
}
```

### 模板管理 API

#### POST /api/upload-template
上传模板图片（需要管理员权限）

**请求参数：**
- image: 文件（multipart/form-data）
- name: 模板名称（可选）

**响应：**
```json
{
  "success": true,
  "templateId": 1,
  "name": "我的课表",
  "image": "/uploads/template-xxx.png"
}
```

#### POST /api/save-template
保存模板配置（需要管理员权限）

**请求参数：**
```json
{
  "templateId": 1,
  "cells": [
    {
      "day": "mon",
      "index": 0,
      "x": 100,
      "y": 80,
      "width": 100,
      "height": 60
    }
  ]
}
```

**响应：**
```json
{
  "success": true
}
```

#### GET /api/templates
获取模板列表（公开）

**响应：**
```json
[
  {
    "templateId": 1,
    "image": "/uploads/template-xxx.png",
    "cellsCount": 10
  }
]
```

#### GET /api/template/:id
获取单个模板详情（公开）

**响应：**
```json
{
  "templateId": 1,
  "image": "/uploads/template-xxx.png",
  "cells": [
    {
      "day": "mon",
      "index": 0,
      "x": 100,
      "y": 80,
      "width": 100,
      "height": 60
    }
  ]
}
```

## 注意事项

1. ⚠️ **确保后端服务器（3001端口）和前端开发服务器（3000端口）同时运行**
2. 🔐 **生产环境务必设置强密码**，不要使用默认密码
3. 📁 上传的图片会保存在 backend/uploads 目录
4. 💾 模板配置数据会保存在 backend/templates-data 目录
5. 🖼️ 导出的图片会自动下载到浏览器默认下载目录
6. 🎯 标记格子时，建议使用较大的图片以获得更好的精度
7. 🔄 修改 `.env` 文件后需要重启后端服务才能生效

## 安全说明

### 当前实现的安全级别

✅ **已实现：**
- 密码存储在服务器端环境变量中
- 前端通过 API 验证密码，不会暴露密码明文
- 路由级别的前端权限控制

⚠️ **注意：**
- 这是**前端控制**的权限系统，适合小型项目和个人使用
- 如需更高安全性，建议在后端关键 API 也添加密码验证
- localStorage 中的数据可能被用户手动修改，但不会影响服务器端安全

### 增强安全性（可选）

如需在后端 API 层面也进行验证，参考 [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) 中的"增强安全性"章节。

## 开发说明

### 添加新功能

1. **后端**：在 server.js 中添加新的路由和处理函数
2. **前端**：在 components 目录下创建新组件或在现有组件中添加功能
3. **权限控制**：如需保护新功能，参考 AdminModeToggle 的实现

### 样式修改

全局样式在 frontend/src/index.css 中定义  
组件特定样式可以使用内联样式或在组件中定义 CSS

### 数据存储

当前实现使用本地文件系统存储数据：
- 图片：backend/uploads/
- 模板数据：backend/templates-data/

如需使用数据库，可以修改 server.js 中的数据存储逻辑（项目已集成 Supabase，可选启用）

## 故障排除

### 常见问题

**Q: 点击"管理模式"没有反应？**  
A: 清除浏览器缓存或强制刷新（Ctrl+Shift+R），确保前端使用了最新代码。

**Q: 密码总是验证失败？**  
A: 检查 `backend/.env` 文件中的 `ADMIN_PASSWORD` 值，确认后端已重启。

**Q: 刷新后管理员状态丢失？**  
A: 检查浏览器是否禁用了 localStorage，或尝试更换浏览器。

**Q: 管理页面显示空白？**  
A: 打开浏览器控制台（F12）查看错误信息，确认路由配置正确。

更多问题请参考 [TEST_GUIDE.md](./TEST_GUIDE.md) 中的"常见问题排查"章节。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

---

**🎉 享受使用课表模板编辑系统！**

如有问题或建议，请查阅相关文档或提交 Issue。
