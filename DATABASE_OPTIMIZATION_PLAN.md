# 数据库优化方案

## 📊 项目现状分析

### 当前架构问题

#### 1. **数据存储方式**
- ❌ 使用本地文件系统存储模板数据
- ❌ 图片存储在 `uploads/` 目录
- ❌ 配置存储在 `templates-data/` 目录的 JSON 文件
- ❌ 无数据一致性保障
- ❌ 不支持并发访问

#### 2. **性能瓶颈**
- ❌ 每次请求都需要读取整个 JSON 文件
- ❌ 无缓存机制
- ❌ 文件读写效率低
- ❌ 无法支持多实例部署

#### 3. **功能限制**
- ❌ 无用户管理系统
- ❌ 无权限控制
- ❌ 无操作日志
- ❌ 无数据版本管理
- ❌ 难以实现复杂查询

---

## 🎯 优化目标

### 核心目标
1. **提升性能**: 查询响应时间 < 100ms
2. **保障数据安全**: 事务支持、备份恢复
3. **支持并发**: 支持多用户同时访问
4. **扩展功能**: 用户管理、权限控制、数据统计
5. **可维护性**: 规范化数据结构、便于扩展

---

## 💡 技术方案选型

### 方案一：MySQL/MariaDB (推荐)

#### 技术栈
```
后端：Node.js + Express
数据库：MySQL 8.0 / MariaDB 10.6
ORM: Sequelize / TypeORM
连接池：mysql2
迁移工具：sequelize-cli / typeorm-migrations
```

#### 优势
- ✅ 成熟稳定，社区活跃
- ✅ 事务支持完善
- ✅ 丰富的数据类型
- ✅ 强大的查询能力
- ✅ 易于招聘相关人才
- ✅ 文档齐全

#### 劣势
- ⚠️ 需要额外的数据库服务
- ⚠️ 学习成本略高

---

### 方案二：MongoDB (备选)

#### 技术栈
```
后端：Node.js + Express
数据库：MongoDB 6.0
ODM: Mongoose
连接池：内置
迁移工具：mongoose-migrate
```

#### 优势
- ✅ 灵活的文档模型
- ✅ 适合存储非结构化数据
- ✅ 水平扩展能力强
- ✅ 开发效率高

#### 劣势
- ⚠️ 事务支持相对较弱
- ⚠️ 占用空间较大
- ⚠️ 复杂查询性能一般

---

### 方案三：PostgreSQL (高级选项)

#### 技术栈
```
后端：Node.js + Express
数据库：PostgreSQL 15
ORM: Sequelize / TypeORM
连接池：pg-pool
迁移工具：db-migrate
```

#### 优势
- ✅ 支持复杂查询
- ✅ JSON 类型支持好
- ✅ 扩展性强
- ✅ ACID 兼容性好

#### 劣势
- ⚠️ 配置相对复杂
- ⚠️ 内存占用较高

---

## 🏗️ 数据库设计方案 (以 MySQL 为例)

### ER 图设计

```
┌─────────────────┐       ┌──────────────────┐
│     users       │       │   templates      │
├─────────────────┤       ├──────────────────┤
│ id (PK)         │       │ id (PK)          │
│ username        │◄──────│ user_id (FK)     │
│ email           │       │ name             │
│ password_hash   │       │ category         │
│ role            │       │ image_url        │
│ created_at      │       │ cells_count      │
│ updated_at      │       │ is_public        │
└─────────────────┘       │ created_at       │
                          │ updated_at       │
                          └──────────────────┘
                                  │
                                  │ 1:N
                                  ▼
                          ┌──────────────────┐
                          │  template_cells  │
                          ├──────────────────┤
                          │ id (PK)          │
                          │ template_id (FK) │
                          │ day              │
                          │ index            │
                          │ x                │
                          │ y                │
                          │ width            │
                          │ height           │
                          │ font_size        │
                          │ color            │
                          └──────────────────┘

┌─────────────────┐       ┌──────────────────┐
│  export_logs    │       │   operations_log │
├─────────────────┤       ├──────────────────┤
│ id (PK)         │       │ id (PK)          │
│ user_id (FK)    │       │ user_id (FK)     │
│ template_id(FK) │       │ action           │
│ image_url       │       │ target_type      │
│ exported_at     │       │ target_id        │
└─────────────────┘       │ details          │
                          │ ip_address       │
                          │ created_at       │
                          └──────────────────┘
```

### 数据表结构

#### 1. users - 用户表
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  avatar_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 2. templates - 模板表
```sql
CREATE TABLE templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'default',
  image_url VARCHAR(255) NOT NULL,
  thumbnail_url VARCHAR(255),
  cells_count INT DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  download_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_category (category),
  INDEX idx_is_public (is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 3. template_cells - 模板格子表
```sql
CREATE TABLE template_cells (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT NOT NULL,
  day ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
  index INT NOT NULL,
  x DECIMAL(10,2) NOT NULL,
  y DECIMAL(10,2) NOT NULL,
  width DECIMAL(10,2) NOT NULL,
  height DECIMAL(10,2) NOT NULL,
  font_size INT DEFAULT 14,
  color VARCHAR(20) DEFAULT '#000000',
  font_family VARCHAR(50) DEFAULT 'Arial',
  text_align VARCHAR(20) DEFAULT 'center',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  INDEX idx_template_id (template_id),
  INDEX idx_day (day),
  UNIQUE KEY unique_cell (template_id, day, index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 4. export_logs - 导出日志表
```sql
CREATE TABLE export_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  template_id INT NOT NULL,
  image_url VARCHAR(255),
  file_size INT,
  exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_exported_at (exported_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 5. operations_log - 操作日志表
```sql
CREATE TABLE operations_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'export'
  target_type VARCHAR(50), -- 'template', 'cell'
  target_id INT,
  details JSON,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 🔧 实施步骤

### 第一阶段：环境搭建 (1-2 天)

#### 1. 安装数据库
```bash
# Docker 方式 (推荐)
docker run --name mysql-db \
  -e MYSQL_ROOT_PASSWORD=your_password \
  -e MYSQL_DATABASE=schedule_db \
  -e MYSQL_USER=schedule_user \
  -e MYSQL_PASSWORD=schedule_pass \
  -p 3306:3306 \
  -d mysql:8.0

# 或使用本地安装
# Windows: 下载安装 MySQL Installer
# macOS: brew install mysql
# Linux: sudo apt-get install mysql-server
```

#### 2. 安装依赖
```bash
cd backend

# 安装数据库驱动和 ORM
npm install mysql2 sequelize
npm install bcryptjs jsonwebtoken  # 用户认证
npm install express-validator      # 数据验证

# 开发工具
npm install --save-dev sequelize-cli dotenv
```

#### 3. 配置环境变量
```bash
# backend/.env
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=schedule_db
DB_USER=schedule_user
DB_PASSWORD=schedule_pass

# JWT 配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d

# 文件上传
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

---

### 第二阶段：数据迁移 (2-3 天)

#### 1. 创建 Sequelize 配置
```javascript
// backend/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = sequelize;
```

#### 2. 定义模型
```javascript
// backend/models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash'
  },
  role: {
    type: DataTypes.ENUM('admin', 'user'),
    defaultValue: 'user'
  },
  avatarUrl: {
    type: DataTypes.STRING(255),
    field: 'avatar_url'
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.passwordHash) {
        user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('passwordHash')) {
        user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
      }
    }
  }
});

User.prototype.validatePassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = User;
```

```javascript
// backend/models/Template.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Template = sequelize.define('Template', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  category: {
    type: DataTypes.STRING(50),
    defaultValue: 'default'
  },
  imageUrl: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'image_url'
  },
  thumbnailUrl: {
    type: DataTypes.STRING(255),
    field: 'thumbnail_url'
  },
  cellsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'cells_count'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_public'
  },
  downloadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'download_count'
  }
}, {
  tableName: 'templates',
  timestamps: true
});

module.exports = Template;
```

```javascript
// backend/models/TemplateCell.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TemplateCell = sequelize.define('TemplateCell', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  templateId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'template_id'
  },
  day: {
    type: DataTypes.ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
    allowNull: false
  },
  index: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  x: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  y: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  width: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  height: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  fontSize: {
    type: DataTypes.INTEGER,
    defaultValue: 14,
    field: 'font_size'
  },
  color: {
    type: DataTypes.STRING(20),
    defaultValue: '#000000'
  },
  fontFamily: {
    type: DataTypes.STRING(50),
    defaultValue: 'Arial',
    field: 'font_family'
  }
}, {
  tableName: 'template_cells',
  timestamps: true
});

module.exports = TemplateCell;
```

#### 3. 建立关联关系
```javascript
// backend/models/index.js
const User = require('./User');
const Template = require('./Template');
const TemplateCell = require('./TemplateCell');
const ExportLog = require('./ExportLog');

// 定义关联
User.hasMany(Template, { foreignKey: 'userId', as: 'templates' });
Template.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Template.hasMany(TemplateCell, { foreignKey: 'templateId', as: 'cells' });
TemplateCell.belongsTo(Template, { foreignKey: 'templateId', as: 'template' });

User.hasMany(ExportLog, { foreignKey: 'userId', as: 'exportLogs' });
ExportLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Template.hasMany(ExportLog, { foreignKey: 'templateId', as: 'exportLogs' });
ExportLog.belongsTo(Template, { foreignKey: 'templateId', as: 'template' });

module.exports = {
  sequelize,
  User,
  Template,
  TemplateCell,
  ExportLog
};
```

#### 4. 数据迁移脚本
```javascript
// backend/scripts/migrate-data.js
const fs = require('fs').promises;
const path = require('path');
const { Template, TemplateCell } = require('../models');

async function migrateFromJSON() {
  const dataDir = path.join(__dirname, '../templates-data');
  const files = await fs.readdir(dataDir);
  
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    
    const filePath = path.join(dataDir, file);
    const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    
    // 创建模板记录
    const template = await Template.create({
      id: data.templateId,
      userId: 1, // 默认管理员
      name: data.name || `模板 #${data.templateId}`,
      category: data.category || 'default',
      imageUrl: data.image,
      cellsCount: data.cells?.length || 0,
      isPublic: true
    });
    
    // 创建格子记录
    if (data.cells && data.cells.length > 0) {
      await TemplateCell.bulkCreate(
        data.cells.map(cell => ({
          templateId: template.id,
          day: cell.day,
          index: cell.index,
          x: cell.x,
          y: cell.y,
          width: cell.width,
          height: cell.height,
          fontSize: cell.fontSize || 14,
          color: cell.color || '#000000'
        }))
      );
    }
    
    console.log(`✓ 迁移模板 #${template.id} 成功`);
  }
}

migrateFromJSON().catch(console.error);
```

---

### 第三阶段：API 改造 (3-4 天)

#### 1. 重构路由
```javascript
// backend/routes/templates.js
const express = require('express');
const router = express.Router();
const { Template, TemplateCell } = require('../models');
const auth = require('../middleware/auth');

// 获取所有公开模板
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const where = { isPublic: true };
    
    if (category) where.category = category;
    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }
    
    const templates = await Template.findAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['username', 'avatarUrl']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个模板详情
router.get('/:id', async (req, res) => {
  try {
    const template = await Template.findByPk(req.params.id, {
      include: [{
        model: TemplateCell,
        as: 'cells',
        order: [['day', 'ASC'], ['index', 'ASC']]
      }]
    });
    
    if (!template) {
      return res.status(404).json({ error: '模板不存在' });
    }
    
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建模板 (需要认证)
router.post('/', auth, async (req, res) => {
  try {
    const { name, category, imageUrl, cells } = req.body;
    
    const template = await Template.create({
      userId: req.user.id,
      name,
      category,
      imageUrl,
      cellsCount: cells?.length || 0,
      isPublic: true
    });
    
    if (cells && cells.length > 0) {
      await TemplateCell.bulkCreate(
        cells.map(cell => ({
          templateId: template.id,
          ...cell
        }))
      );
    }
    
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新模板 (需要认证)
router.put('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findByPk(req.params.id);
    
    if (!template) {
      return res.status(404).json({ error: '模板不存在' });
    }
    
    // 权限检查
    if (template.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '无权限修改' });
    }
    
    await template.update(req.body);
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除模板 (需要认证)
router.delete('/:id', auth, async (req, res) => {
  try {
    const template = await Template.findByPk(req.params.id);
    
    if (!template) {
      return res.status(404).json({ error: '模板不存在' });
    }
    
    if (template.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '无权限删除' });
    }
    
    await template.destroy();
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

#### 2. 添加认证中间件
```javascript
// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: '未授权' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token 无效' });
  }
};
```

---

### 第四阶段：前端适配 (2-3 天)

#### 1. 添加认证功能
```javascript
// frontend/src/services/auth.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const login = async (username, password) => {
  const response = await axios.post(`${API_URL}/api/auth/login`, {
    username,
    password
  });
  localStorage.setItem('token', response.data.token);
  return response.data;
};

export const register = async (userData) => {
  const response = await axios.post(`${API_URL}/api/auth/register`, userData);
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
};

export const getCurrentUser = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
};
```

#### 2. 配置 Axios 拦截器
```javascript
// frontend/src/utils/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 📈 性能优化策略

### 1. 连接池优化
```javascript
// backend/config/database.js
{
  pool: {
    max: 20,      // 最大连接数
    min: 5,       // 最小连接数
    acquire: 30000,
    idle: 10000
  }
}
```

### 2. 查询优化
```javascript
// 使用索引
const templates = await Template.findAll({
  where: { 
    isPublic: true,
    category: '简约风'
  },
  limit: 20,
  offset: 0
});

// 只选择需要的字段
const templates = await Template.findAll({
  attributes: ['id', 'name', 'imageUrl', 'category'],
  where: { isPublic: true }
});
```

### 3. 缓存策略
```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5 分钟

// 缓存查询结果
router.get('/', async (req, res) => {
  const cacheKey = `templates:${JSON.stringify(req.query)}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return res.json(cached);
  }
  
  const templates = await Template.findAll({ /* ... */ });
  cache.set(cacheKey, templates);
  res.json(templates);
});
```

### 4. 图片存储优化
```javascript
// 使用 CDN 或对象存储
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET
});

// 上传图片到 S3
const uploadToS3 = async (file) => {
  const params = {
    Bucket: 'schedule-templates',
    Key: `templates/${Date.now()}-${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype
  };
  
  return s3.upload(params).promise();
};
```

---

## 🔒 安全加固

### 1. SQL 注入防护
- ✅ 使用 ORM 参数化查询
- ✅ 输入数据验证
- ✅ 最小权限原则

### 2. 密码安全
```javascript
// 密码强度验证
const validatePassword = (password) => {
  return password.length >= 8 &&
         /[A-Z]/.test(password) &&
         /[0-9]/.test(password);
};
```

### 3. 速率限制
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100 // 最多 100 个请求
});

app.use('/api/', limiter);
```

---

## 📊 监控与运维

### 1. 日志记录
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 2. 数据库备份
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p schedule_db > backup_$DATE.sql
gzip backup_$DATE.sql
```

### 3. 性能监控
```javascript
// 慢查询日志
{
  logging: (query, timing) => {
    if (timing > 1000) {
      logger.warn(`Slow query: ${query} (${timing}ms)`);
    }
  }
}
```

---

## 📅 项目计划

| 阶段 | 任务 | 时间 | 负责人 |
|------|------|------|--------|
| 第一阶段 | 环境搭建 | 1-2 天 | 后端组 |
| 第二阶段 | 数据迁移 | 2-3 天 | 后端组 |
| 第三阶段 | API 改造 | 3-4 天 | 后端组 |
| 第四阶段 | 前端适配 | 2-3 天 | 前端组 |
| 第五阶段 | 测试调优 | 2-3 天 | 全体 |
| **总计** | | **10-15 天** | |

---

## 🎯 预期收益

### 性能提升
- ⚡ 查询速度提升 **10-50 倍**
- ⚡ 支持 **100+** 并发用户
- ⚡ 响应时间 < **100ms**

### 功能增强
- ✨ 用户管理系统
- ✨ 权限控制
- ✨ 数据统计分析
- ✨ 操作审计日志

### 可维护性
- 🔧 规范化数据结构
- 🔧 完善的文档
- 🔧 自动化测试
- 🔧 CI/CD 集成

---

## 📝 注意事项

1. **数据备份**: 迁移前务必备份所有 JSON 文件
2. **灰度发布**: 先在测试环境验证，再逐步上线
3. **回滚方案**: 保留原有代码，随时可以回退
4. **性能测试**: 上线前进行压力测试
5. **监控告警**: 配置数据库监控和告警

---

## 🚀 快速开始

```bash
# 1. 克隆项目
git clone <repo>
cd demo1

# 2. 启动数据库
docker-compose up -d mysql

# 3. 安装依赖
cd backend && npm install
cd ../frontend && npm install

# 4. 运行迁移
cd backend
npx sequelize-cli db:migrate
node scripts/migrate-data.js

# 5. 启动服务
npm start
```

---

**推荐方案**: 采用 **MySQL + Sequelize** 组合，平衡性能、成本和开发效率！🎉
