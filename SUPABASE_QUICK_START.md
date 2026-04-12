# Supabase 快速开始指南

## 🚀 5分钟快速配置

### 1. 创建项目（2分钟）
```
访问: https://supabase.com
点击 "New Project"
填写: Name, Password, Region (Asia Singapore)
等待初始化完成
```

### 2. 获取密钥（1分钟）
```
Settings → API
复制:
- Project URL: https://xxxxx.supabase.co
- anon public: eyJhbG...
```

### 3. 执行SQL（1分钟）
```
SQL Editor → New query
复制 supabase-init.sql 全部内容
点击 Run
```

### 4. 配置环境变量（1分钟）

**backend/.env**
```env
SUPABASE_URL=https://你的项目URL.supabase.co
SUPABASE_ANON_KEY=你的anon_key
ENABLE_SUPABASE_SYNC=false
```

**frontend/.env**
```env
REACT_APP_SUPABASE_URL=https://你的项目URL.supabase.co
REACT_APP_SUPABASE_ANON_KEY=你的anon_key
```

### 5. 启动测试
```bash
# 终端1
cd backend && npm start

# 终端2  
cd frontend && npm start

# 浏览器访问
http://localhost:3001/api/supabase/status
```

看到 `{"success":true,"available":true}` 即成功！✅

---

## 📝 常用命令

### 检查状态
```bash
curl http://localhost:3001/api/supabase/status
```

### 开启自动同步
```bash
curl -X POST http://localhost:3001/api/supabase/toggle-sync \
  -H "Content-Type: application/json" \
  -d '{"enable": true}'
```

### 批量同步
```bash
curl -X POST http://localhost:3001/api/supabase/sync-all
```

---

## 🔗 重要链接

- **Supabase Dashboard**: https://app.supabase.com
- **官方文档**: https://supabase.com/docs
- **详细指南**: 查看 SUPABASE_SETUP_GUIDE.md
- **集成总结**: 查看 SUPABASE_INTEGRATION_COMPLETE.md

---

## ⚡ 核心要点

✅ **混合架构** - 本地+云端双存储  
✅ **向后兼容** - 不影响现有功能  
✅ **可选启用** - 不配置也能正常运行  
✅ **异步同步** - 不阻塞主流程  

❌ **不需要**修改现有代码  
❌ **不需要**迁移历史数据  
❌ **不需要**担心性能问题  

---

## 🆘 遇到问题？

1. 检查 .env 文件是否正确配置
2. 确认 SQL 脚本已执行成功
3. 查看控制台日志
4. 参考详细文档 SUPABASE_SETUP_GUIDE.md

**就这么简单！** 🎉
