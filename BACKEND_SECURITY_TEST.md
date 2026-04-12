# 🔒 后端API权限验证 - 测试指南

## 📋 测试目标

验证后端API的权限控制是否正常工作，确保只有认证的管理员才能上传和保存模板。

---

## 🧪 测试场景

### 场景1：管理员正常上传模板（应该成功）

#### 步骤
1. 打开浏览器访问 `http://localhost:3000`
2. 点击右上角 **"🔑 管理模式"** 按钮
3. 输入密码：`admin123456`
4. 点击 **"确认"**
5. 导航栏出现 **"管理"** 链接，点击进入
6. 点击 **"📤 上传新模板"** 按钮
7. 选择一张图片文件
8. 输入模板名称
9. 点击 **"确认上传"**

#### 预期结果
✅ 上传成功  
✅ 显示"模板上传成功"提示  
✅ 自动选中新上传的模板  
✅ 可以标记格子并保存  

#### 控制台输出
**前端控制台：**
```
正在验证密码...
服务器响应: {success: true, message: "验证成功，管理员模式已启用"}
验证成功，进入管理员模式
API请求: POST /api/upload-template
API响应: 200 /api/upload-template
```

**后端控制台：**
```
收到密码验证请求
输入的密码: admin123456
配置的ADMIN_PASSWORD: 已设置
密码验证成功！
```

---

### 场景2：管理员正常保存模板（应该成功）

#### 步骤
1. 确保已进入管理模式
2. 选择一个模板
3. 切换到"✏️ 标记模式"
4. 在图片上拖拽创建格子
5. 设置星期和节次
6. 点击 **"💾 保存配置"**

#### 预期结果
✅ 保存成功  
✅ 显示"模板配置已保存"提示  
✅ 刷新页面后格子仍然存在  

---

### 场景3：未登录用户尝试上传（应该失败）

#### 方法A：通过浏览器工具

1. **不要**进入管理模式
2. 按 F12 打开开发者工具
3. 切换到 **Console** 标签
4. 执行以下代码：

```javascript
// 创建一个假的FormData
const formData = new FormData();
formData.append('image', new Blob(['test']), 'test.jpg');
formData.append('name', 'Test Template');

// 尝试上传（没有密码）
fetch('http://localhost:3001/api/upload-template', {
  method: 'POST',
  body: formData
})
.then(res => res.json())
.then(data => console.log('响应:', data))
.catch(err => console.error('错误:', err));
```

#### 预期结果
❌ 返回 403 Forbidden  
❌ 错误信息："需要管理员权限"  

**控制台输出：**
```
响应: {error: "需要管理员权限"}
```

---

#### 方法B：使用curl命令

打开新的终端窗口，执行：

```bash
curl -X POST http://localhost:3001/api/upload-template ^
  -F "image=@test.jpg" ^
  -F "name=Test"
```

#### 预期结果
```json
{
  "error": "需要管理员权限"
}
```

---

### 场景4：使用错误密码尝试上传（应该失败）

#### 通过curl测试

```bash
curl -X POST http://localhost:3001/api/upload-template ^
  -F "image=@test.jpg" ^
  -F "name=Test" ^
  -F "adminPassword=wrongpassword"
```

#### 预期结果
❌ 返回 403 Forbidden  
❌ 错误信息："需要管理员权限"  

```json
{
  "error": "需要管理员权限"
}
```

---

### 场景5：退出管理后无法上传（应该失败）

#### 步骤
1. 先进入管理模式
2. 点击右上角 **"退出管理"** 按钮
3. 尝试上传模板（重复场景1的步骤6-9）

#### 预期结果
❌ 上传失败  
❌ 显示"需要管理员权限"或"上传失败"  
❌ localStorage 中的 `adminPassword` 已被清除  

#### 验证localStorage
在控制台执行：
```javascript
console.log('isAdmin:', localStorage.getItem('isAdmin'));
console.log('adminPassword:', localStorage.getItem('adminPassword'));
```

**预期输出：**
```
isAdmin: null
adminPassword: null
```

---

### 场景6：直接调用保存API（应该失败）

#### 通过浏览器工具

1. **不要**进入管理模式
2. 在控制台执行：

```javascript
fetch('http://localhost:3001/api/save-template', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    templateId: 1,
    cells: [
      { day: 'mon', index: 0, x: 100, y: 100, width: 50, height: 30 }
    ]
  })
})
.then(res => res.json())
.then(data => console.log('响应:', data))
.catch(err => console.error('错误:', err));
```

#### 预期结果
❌ 返回 403 Forbidden  
❌ 错误信息："需要管理员权限"  

---

### 场景7：密码被篡改后无法操作（应该失败）

#### 步骤
1. 进入管理模式
2. 在控制台执行：
```javascript
localStorage.setItem('adminPassword', 'hacked_password');
```
3. 尝试上传或保存模板

#### 预期结果
❌ 操作失败  
❌ 显示"需要管理员权限"  

---

## 🔍 调试技巧

### 1. 检查localStorage

```javascript
// 查看当前存储的数据
console.table({
  isAdmin: localStorage.getItem('isAdmin'),
  adminPassword: localStorage.getItem('adminPassword') ? '***已设置***' : '未设置'
});
```

### 2. 监控网络请求

1. 打开开发者工具（F12）
2. 切换到 **Network** 标签
3. 执行上传或保存操作
4. 查看请求详情：
   - Request Payload 中是否包含 `adminPassword`
   - Response 状态码是否为 200 或 403

### 3. 查看后端日志

后端控制台会显示：
```
收到密码验证请求
输入的密码: ***
配置的ADMIN_PASSWORD: 已设置
密码验证成功！/ 密码验证失败！
```

---

## ✅ 测试清单

### 功能测试

- [ ] 管理员可以正常上传模板
- [ ] 管理员可以正常保存模板配置
- [ ] 未登录用户无法上传模板
- [ ] 未登录用户无法保存模板
- [ ] 错误密码无法通过验证
- [ ] 退出管理后无法操作
- [ ] localStorage正确保存和清除密码

### 安全性测试

- [ ] 直接调用API被拒绝（无密码）
- [ ] 错误密码被拒绝
- [ ] 篡改localStorage后被拒绝
- [ ] 后端返回明确的403错误
- [ ] 前端显示友好的错误提示

### 边界测试

- [ ] 空密码被拒绝
- [ ] 空格密码被拒绝
- [ ] 超长密码正确处理
- [ ] 特殊字符密码正确处理
- [ ] 并发请求正确处理

---

## 🐛 常见问题排查

### 问题1：上传总是失败，显示"需要管理员权限"

**可能原因：**
1. 未进入管理模式
2. localStorage中没有保存密码
3. 后端服务未重启

**解决方法：**
```javascript
// 检查localStorage
console.log(localStorage.getItem('adminPassword'));

// 如果没有，重新登录
// 或者手动设置（仅用于调试）
localStorage.setItem('adminPassword', 'admin123456');
```

---

### 问题2：后端返回500错误

**可能原因：**
1. ADMIN_PASSWORD未配置
2. server.js语法错误

**解决方法：**
```bash
# 检查.env文件
cat backend/.env

# 应该包含
ADMIN_PASSWORD=admin123456

# 检查后端日志
cd backend
npm start
```

---

### 问题3：前端不发送adminPassword

**可能原因：**
1. TemplateManager组件未更新
2. 浏览器缓存旧代码

**解决方法：**
```
Ctrl + F5 强制刷新
或
清除浏览器缓存
```

---

### 问题4：退出管理后仍能上传

**可能原因：**
1. handleExitAdmin未清除密码
2. 浏览器缓存

**解决方法：**
```javascript
// 手动清除
localStorage.removeItem('adminPassword');
localStorage.removeItem('isAdmin');

// 刷新页面
location.reload();
```

---

## 📊 测试结果记录表

| 测试场景 | 预期结果 | 实际结果 | 状态 | 备注 |
|---------|---------|---------|------|------|
| 管理员上传 | ✅ 成功 | | ⬜ | |
| 管理员保存 | ✅ 成功 | | ⬜ | |
| 未登录上传 | ❌ 403 | | ⬜ | |
| 错误密码 | ❌ 403 | | ⬜ | |
| 退出后上传 | ❌ 403 | | ⬜ | |
| 直接调用API | ❌ 403 | | ⬜ | |
| 篡改密码 | ❌ 403 | | ⬜ | |

---

## 🎯 验收标准

所有测试必须通过以下标准：

### 功能性
- ✅ 管理员可以正常使用所有功能
- ✅ 非管理员无法执行敏感操作
- ✅ 错误提示清晰明确

### 安全性
- ✅ 后端强制验证密码
- ✅ 前端无法绕过验证
- ✅ 密码不在日志中明文显示

### 用户体验
- ✅ 管理员操作流程顺畅
- ✅ 错误提示友好
- ✅ 无需重复输入密码（会话期间）

---

## 🚀 下一步

如果所有测试通过：

1. ✅ 更新README.md添加安全说明
2. ✅ 部署到生产环境
3. ✅ 配置HTTPS
4. ✅ 考虑实现JWT Token认证

如果有测试失败：

1. 🔍 查看详细错误信息
2. 🐛 修复对应的问题
3. 🔄 重新运行测试
4. ✅ 确认所有测试通过

---

**测试日期**: 2026-04-11  
**测试人员**: ___________  
**测试结果**: ⬜ 通过  ⬜ 失败  
**备注**: ___________
