const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// 中间件配置
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filepath) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// 确保上传目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 确保模板数据目录存在
const templatesDir = path.join(__dirname, 'templates-data');
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'template-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// 生成模板ID
let templateIdCounter = 1;

// API: 上传模板图片
app.post('/api/upload-template', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const templateId = templateIdCounter++;
    const imagePath = `/uploads/${req.file.filename}`;

    // 创建初始模板数据
    const templateData = {
      templateId,
      image: imagePath,
      cells: []
    };

    // 保存模板数据
    fs.writeFileSync(
      path.join(templatesDir, `${templateId}.json`),
      JSON.stringify(templateData, null, 2)
    );

    res.json({
      success: true,
      templateId,
      image: imagePath
    });
  } catch (error) {
    console.error('上传错误:', error);
    res.status(500).json({ error: '上传失败' });
  }
});

// API: 保存模板配置
app.post('/api/save-template', (req, res) => {
  try {
    const { templateId, cells } = req.body;

    if (!templateId || !cells) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 读取现有模板数据
    const templatePath = path.join(templatesDir, `${templateId}.json`);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: '模板不存在' });
    }

    const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

    // 更新格子数据
    templateData.cells = cells;

    // 保存更新后的数据
    fs.writeFileSync(templatePath, JSON.stringify(templateData, null, 2));

    res.json({ success: true });
  } catch (error) {
    console.error('保存错误:', error);
    res.status(500).json({ error: '保存失败' });
  }
});

// API: 获取模板列表
app.get('/api/templates', (req, res) => {
  try {
    const templates = [];
    const files = fs.readdirSync(templatesDir);

    files.forEach(file => {
      if (file.endsWith('.json')) {
        const templateData = JSON.parse(
          fs.readFileSync(path.join(templatesDir, file), 'utf8')
        );
        templates.push({
          templateId: templateData.templateId,
          image: templateData.image,
          cellsCount: templateData.cells.length
        });
      }
    });

    res.json(templates);
  } catch (error) {
    console.error('获取模板列表错误:', error);
    res.status(500).json({ error: '获取模板列表失败' });
  }
});

// API: 获取单个模板
app.get('/api/template/:id', (req, res) => {
  try {
    const templateId = req.params.id;
    const templatePath = path.join(templatesDir, `${templateId}.json`);

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: '模板不存在' });
    }

    const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
    res.json(templateData);
  } catch (error) {
    console.error('获取模板错误:', error);
    res.status(500).json({ error: '获取模板失败' });
  }
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
