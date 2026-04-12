# Supabase 集成验证清单

## ✅ 代码实现检查

### 后端文件
- [x] `backend/supabaseClient.js` - Supabase 客户端模块
- [x] `backend/server.js` - 已集成 Supabase API
- [x] `backend/.env.example` - 环境变量模板
- [x] `backend/package.json` - 已安装 @supabase/supabase-js

### 前端文件
- [x] `frontend/src/lib/supabaseClient.js` - 前端客户端模块
- [x] `frontend/src/components/SupabaseSyncManager.js` - 云同步管理组件
- [x] `frontend/.env.example` - 环境变量模板
- [x] `frontend/package.json` - 已安装 @supabase/supabase-js

### 数据库脚本
- [x] `supabase-init.sql` - 完整的数据库初始化脚本

### 文档
- [x] `SUPABASE_QUICK_START.md` - 5分钟快速开始
- [x] `SUPABASE_SETUP_GUIDE.md` - 详细集成指南
- [x] `SUPABASE_INTEGRATION_COMPLETE.md` - 完成总结
- [x] `SUPABASE_INTEGRATION.md` - 架构设计（原有）
- [x] `SUPABASE_COMPATIBLE_INTEGRATION.md` - 兼容策略（原有）

---

## 📋 用户操作检查清单

### 第一步：创建 Supabase 项目
- [ ] 访问 https://supabase.com 注册账号
- [ ] 创建新项目（Name: schedule-template）
- [ ] 选择区域（推荐 Asia Singapore）
- [ ] 设置数据库密码（请妥善保存）
- [ ] 等待项目初始化完成（2-3分钟）

### 第二步：获取 API 密钥
- [ ] 进入 Settings → API
- [ ] 复制 Project URL
- [ ] 复制 anon public key
- [ ] 保存到安全位置

### 第三步：初始化数据库
- [ ] 打开 SQL Editor
- [ ] 复制 supabase-init.sql 全部内容
- [ ] 粘贴并执行
- [ ] 验证表创建成功（templates, template_cells, export_logs）
- [ ] 确认 Storage Bucket 已创建（template-images）

### 第四步：配置环境变量

#### 后端配置
- [ ] 在 backend/ 目录创建 .env 文件
- [ ] 填写 SUPABASE_URL
- [ ] 填写 SUPABASE_ANON_KEY
- [ ] 设置 ENABLE_SUPABASE_SYNC（可选，默认 false）
- [ ] 保存文件

#### 前端配置
- [ ] 在 frontend/ 目录创建 .env 文件
- [ ] 填写 REACT_APP_SUPABASE_URL
- [ ] 填写 REACT_APP_SUPABASE_ANON_KEY
- [ ] 保存文件

### 第五步：启动和测试
- [ ] 启动后端：`cd backend && npm start`
- [ ] 查看控制台输出 "✅ Supabase 客户端已初始化"
- [ ] 启动前端：`cd frontend && npm start`
- [ ] 浏览器访问 http://localhost:3001/api/supabase/status
- [ ] 确认返回 `{"success":true,"available":true}`

### 第六步：功能测试
- [ ] 使用云同步管理组件（如已集成到路由）
- [ ] 或手动调用 API 测试同步功能
- [ ] 上传一个新模板
- [ ] 检查本地 JSON 文件是否创建
- [ ] 开启自动同步后再次上传
- [ ] 在 Supabase Dashboard 查看数据是否同步

---

## 🔍 验证命令

### 1. 检查后端连接
```bash
curl http://localhost:3001/api/supabase/status
```
预期输出：
```json
{
  "success": true,
  "available": true,
  "syncEnabled": false,
  "message": "Supabase 已连接但未启用自动同步"
}
```

### 2. 测试单个模板同步
```bash
curl -X POST http://localhost:3001/api/supabase/sync-template \
  -H "Content-Type: application/json" \
  -d '{"templateId": 1}'
```

### 3. 批量同步所有模板
```bash
curl -X POST http://localhost:3001/api/supabase/sync-all
```

### 4. 切换自动同步
```bash
# 开启
curl -X POST http://localhost:3001/api/supabase/toggle-sync \
  -H "Content-Type: application/json" \
  -d '{"enable": true}'

# 关闭
curl -X POST http://localhost:3001/api/supabase/toggle-sync \
  -H "Content-Type: application/json" \
  -d '{"enable": false}'
```

---

## 🎯 功能验证点

### 基础功能
- [ ] 系统可以在不配置 Supabase 的情况下正常运行
- [ ] 本地文件存储功能完全不受影响
- [ ] 所有原有 API 正常工作

### Supabase 功能
- [ ] 可以连接到 Supabase
- [ ] 可以手动同步单个模板
- [ ] 可以批量同步所有模板
- [ ] 可以查询云端数据
- [ ] 自动同步开关可以正常切换

### 数据一致性
- [ ] 本地 JSON 和 Supabase 数据保持一致
- [ ] 同步失败不影响本地存储
- [ ] 后台异步同步不阻塞主流程

---

## ⚠️ 常见问题自查

### 如果提示 "Supabase 未配置"
- [ ] 检查 backend/.env 是否存在
- [ ] 检查 SUPABASE_URL 是否正确
- [ ] 检查 SUPABASE_ANON_KEY 是否正确
- [ ] 重启后端服务

### 如果提示连接失败
- [ ] 检查网络连接
- [ ] 确认 Supabase 项目处于活跃状态
- [ ] 验证 API Key 没有多余空格
- [ ] 检查防火墙设置

### 如果同步失败
- [ ] 检查 SQL 脚本是否执行成功
- [ ] 确认数据库表存在
- [ ] 查看后端控制台错误日志
- [ ] 检查 Supabase Dashboard 的 Logs

### 如果前端无法访问
- [ ] 检查 frontend/.env 是否存在
- [ ] 确认 REACT_APP_ 前缀正确
- [ ] 重启前端开发服务器
- [ ] 清除浏览器缓存

---

## 📊 性能基准

| 操作 | 预期时间 | 说明 |
|------|---------|------|
| 本地读取模板 | < 10ms | 从 JSON 文件读取 |
| Supabase 读取 | 30-50ms | 网络请求 + 数据库查询 |
| 上传模板 | < 100ms | 本地保存 |
| 同步到云端 | 200-500ms | 后台异步，不阻塞 |
| 批量同步（10个） | 2-5秒 | 取决于网络和数据量 |

---

## ✅ 最终确认

完成以上所有检查后，确认：

- [ ] Supabase 项目已成功创建
- [ ] 数据库表已正确初始化
- [ ] 环境变量已正确配置
- [ ] 后端服务正常启动
- [ ] 前端服务正常启动
- [ ] API 连接测试通过
- [ ] 手动同步功能正常
- [ ] 自动同步功能可选
- [ ] 本地存储不受影响
- [ ] 所有文档已阅读

**恭喜！🎉 Supabase 集成验证完成！**

---

## 📞 需要帮助？

1. 查看详细文档：`SUPABASE_SETUP_GUIDE.md`
2. 参考快速开始：`SUPABASE_QUICK_START.md`
3. 查看集成总结：`SUPABASE_INTEGRATION_COMPLETE.md`
4. 访问 Supabase 官方文档：https://supabase.com/docs

**祝你使用愉快！** ✨
