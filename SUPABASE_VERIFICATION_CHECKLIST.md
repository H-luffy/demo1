# Supabase 集成验证清单

## ✅ 兼容性测试清单

### 阶段 1：现有功能测试（不安装 Supabase）

#### 测试 1：上传模板
```bash
# 启动服务
cd backend && npm start
cd frontend && npm start

# 操作步骤
1. 访问 http://localhost:3000/manager
2. 点击"📤 上传新模板"
3. 选择一张图片
4. 输入模板名称
5. 确认上传

# 验证结果
✅ 图片保存在 backend/uploads/
✅ 生成 backend/templates-data/{id}.json
✅ 前端显示新模板
✅ 可以正常标记格子
```

**预期文件变化：**
```
backend/
├── uploads/
│   └── template-1712345678901-123456.jpg  ← 新增
└── templates-data/
    └── 5.json                              ← 新增（假设之前有 4 个模板）
```

---

#### 测试 2：标记格子
```bash
# 操作步骤
1. 选择刚上传的模板
2. 切换到"✏️ 标记模式"
3. 在图片上拖拽创建格子
4. 设置星期和节次
5. 点击"💾 保存配置"

# 验证结果
✅ templates-data/{id}.json 中包含 cells 数组
✅ 每个 cell 包含 day, index, x, y, width, height
✅ 前端正确显示格子框
✅ 删除格子后保存，JSON 中对应格子消失
```

**JSON 内容示例：**
```json
{
  "templateId": 5,
  "name": "我的课表",
  "image": "/uploads/template-1712345678901-123456.jpg",
  "cells": [
    {
      "day": "mon",
      "index": 0,
      "x": 375,
      "y": 252,
      "width": 62,
      "height": 33
    },
    {
      "day": "tue",
      "index": 1,
      "x": 450,
      "y": 300,
      "width": 65,
      "height": 35
    }
  ]
}
```

---

#### 测试 3：查看和使用模板
```bash
# 操作步骤
1. 访问 http://localhost:3000/browser
2. 选择刚才创建的模板
3. 输入课程内容
4. 导出为图片

# 验证结果
✅ 模板列表显示所有模板（包括新的）
✅ 格子位置准确对应课程内容
✅ 导出的 PNG 图片清晰完整
```

---

### 阶段 2：Supabase 集成后测试（可选）

#### 前置条件检查
```bash
# 检查是否已创建 Supabase 项目
□ 已注册 https://supabase.com
□ 已创建项目
□ 已获取 Project URL
□ 已获取 Anon Key
□ 已执行 SQL 建表脚本

# 检查前端配置
□ 已安装 @supabase/supabase-js
□ 已创建 frontend/.env 文件
□ 已配置 REACT_APP_SUPABASE_URL
□ 已配置 REACT_APP_SUPABASE_ANON_KEY
□ REACT_APP_ENABLE_CLOUD_SYNC=false (先关闭)
```

---

#### 测试 4：本地模式继续工作
```bash
# 即使安装了 Supabase，也要验证本地功能不受影响

# 操作步骤
1. 保持 .env 中 ENABLE_CLOUD_SYNC=false
2. 重启前端
3. 重复测试 1-3

# 验证结果
✅ 所有功能与安装前完全一致
✅ 没有任何错误提示
✅ 速度没有变慢
✅ 数据仍然保存在本地
```

**关键点：** 如果这一步有任何问题，说明集成有问题，需要回滚！

---

#### 测试 5：云同步功能（可选）
```bash
# 开启云同步
# 修改 frontend/.env
REACT_APP_ENABLE_CLOUD_SYNC=true

# 重启前端
npm start

# 操作步骤
1. 访问 /manager
2. 上传新模板或选择已有模板
3. 标记格子
4. 点击"☁️ 保存并同步"按钮

# 验证结果
✅ 本地 JSON 文件正常保存
✅ Supabase Dashboard → templates 表中有新记录
✅ Supabase Dashboard → template_cells 表中有格子数据
✅ 控制台显示同步成功日志
```

**数据库验证 SQL：**
```sql
-- 查看最新模板
SELECT id, name, local_image_path, cells_count, created_at
FROM templates
ORDER BY created_at DESC
LIMIT 1;

-- 查看对应格子
SELECT day, index, x, y, width, height
FROM template_cells
WHERE template_id = (SELECT id FROM templates ORDER BY created_at DESC LIMIT 1);
```

---

#### 测试 6：跨设备访问（仅当需要时）
```bash
# 在另一台电脑上
1. 部署同样的前端（或直接用 Vercel 部署）
2. 配置相同的 Supabase 项目
3. 登录相同账号
4. 访问 /browser

# 验证结果
✅ 可以看到云端的所有模板
✅ 可以选择并编辑
✅ 导出功能正常
```

---

## 🔍 故障排查指南

### 问题 1：安装 Supabase 后本地功能异常
**症状：** 上传模板失败、格子无法保存等

**解决步骤：**
```bash
# 1. 检查 .env 配置
cat frontend/.env
# 应该看到 REACT_APP_ENABLE_CLOUD_SYNC=false

# 2. 临时禁用 Supabase
mv frontend/.env frontend/.env.backup

# 3. 重启前端
npm start

# 4. 验证本地功能恢复
```

---

### 问题 2：云同步失败但本地正常
**症状：** 点击"保存并同步"报错，但本地 JSON 已保存

**诊断步骤：**
```javascript
// 打开浏览器控制台，执行
import { supabase, isCloudSyncEnabled } from './lib/supabaseClient';

console.log('Supabase 启用状态:', isCloudSyncEnabled());
console.log('Supabase 客户端:', supabase);

// 测试连接
supabase.from('templates').select('count').then(console.log);
```

**可能原因：**
- ❌ Supabase URL 或 Key 配置错误
- ❌ 网络问题无法访问 Supabase
- ❌ RLS 策略配置不正确
- ❌ 用户未登录

---

### 问题 3：格子数据不一致
**症状：** 本地 JSON 和数据库中的格子数量不匹配

**解决步骤：**
```bash
# 1. 对比数据
# 本地 JSON
cat backend/templates-data/5.json | jq '.cells | length'

# 数据库
SELECT count(*) FROM template_cells WHERE template_id = 5;

# 2. 如果不一致，重新同步
# 在前端控制台执行
const templateData = require('./backend/templates-data/5.json');
syncTemplateToCloud(5, templateData);
```

---

## 📊 性能基准测试

### 本地模式性能
```bash
# 测试项目录（50 个模板，每个 20 个格子）
操作                  目标时间    实际时间    结果
-----------------------------------------------------
加载模板列表          <100ms      ___ms      ☐
打开单个模板          <50ms       ___ms      ☐
保存格子配置          <100ms      ___ms      ☐
导出课表图片          <2s         ___ms      ☐
```

### 云同步模式性能
```bash
# 同样测试项目录
操作                  目标时间    实际时间    结果
-----------------------------------------------------
加载模板列表（本地）  <100ms      ___ms      ☐
加载模板列表（云端）  <500ms      ___ms      ☐
保存并同步            <2s         ___ms      ☐
跨设备加载            <1s         ___ms      ☐
```

**合格标准：**
- ✅ 本地操作性能下降不超过 10%
- ✅ 云同步失败不影响本地保存
- ✅ 用户可感知的时间延迟都有进度提示

---

## ✅ 最终验收标准

### 必须满足的条件
- [ ] 不配置 Supabase 时，所有功能完全正常
- [ ] 配置 Supabase 但关闭同步时，性能无明显下降
- [ ] 开启云同步后，本地数据仍然正常保存
- [ ] 云同步失败不会阻塞本地保存
- [ ] 用户可以随时切换回纯本地模式
- [ ] 历史模板数据不会丢失

### 可选加分项
- [ ] 提供一键迁移工具（将旧模板同步到云端）
- [ ] 提供冲突检测（本地和云端数据不一致时提示）
- [ ] 提供同步日志（查看每次同步的状态）

---

## 🎯 下一步行动

### 如果你决定现在实施：
1. **先做阶段 1 测试** - 确保当前系统完全正常
2. **备份现有数据** - `cp -r backend/templates-data backup/`
3. **按照文档逐步实施** - 参考 SUPABASE_COMPATIBLE_INTEGRATION.md
4. **每步都验证** - 使用本清单的测试用例

### 如果你想以后再说：
1. **保存这个文档** - SUPABASE_COMPATIBLE_INTEGRATION.md
2. **继续正常使用** - 完全不受影响
3. **需要时再实施** - 随时都可以开始

---

## 💡 关键提醒

**无论何时开始集成，都要记住：**
1. 你的本地操作永远是第一位的
2. 云同步只是锦上添花，不是必须的
3. 如果集成出现问题，立即回滚到纯本地模式
4. 定期备份 templates-data 目录

**现在就可以测试一下，确保你随时可以继续上传模板和标记格子！** ✨
