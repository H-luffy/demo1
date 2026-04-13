require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const supabaseClient = require('./supabaseClient');

const app = express();
const PORT = 3001;

const QWEN_API_KEY = process.env.QWEN_API_KEY || '';
const QWEN_TEXT_MODEL = process.env.QWEN_TEXT_MODEL || 'qwen-plus';
const QWEN_IMAGE_EDIT_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis';
const QWEN_TASK_API_URL = 'https://dashscope.aliyuncs.com/api/v1/tasks';
const QWEN_CHAT_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const QWEN_TASK_POLL_INTERVAL_MS = 3000;
const QWEN_TASK_TIMEOUT_MS = 60000;

// 管理员密码（从环境变量读取）
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// 管理员权限验证中间件
function requireAdminAuth(req, res, next) {
  console.log('requireAdminAuth - req.body:', req.body);
  console.log('requireAdminAuth - req.headers:', req.headers);

  // 从多个可能的来源获取管理员密码
  const adminPassword = req.body?.adminPassword || 
                       req.body?.adminPassword?.toString() ||
                       req.headers['x-admin-password'] ||
                       req.query?.adminPassword;

  console.log('requireAdminAuth - adminPassword:', adminPassword ? '***' : 'undefined');
  console.log('requireAdminAuth - ADMIN_PASSWORD:', ADMIN_PASSWORD ? '***' : 'undefined');
  
  if (!ADMIN_PASSWORD) {
    console.error('管理员密码未配置');
    return res.status(500).json({ error: '管理员密码未配置' });
  }
  
  if (!adminPassword || adminPassword !== ADMIN_PASSWORD) {
    console.error('管理员权限验证失败');
    return res.status(403).json({ error: '需要管理员权限' });
  }
  
  console.log('管理员权限验证成功');
  next();
}

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // 添加你的 Vercel 前端 URL，部署后需要替换为实际的 Vercel URL
    // 例如：'https://your-app.vercel.app'
  ],
  credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const uploadsDir = path.join(__dirname, 'uploads');
const templatesDir = path.join(__dirname, 'templates-data');

app.use('/uploads', (req, res, next) => {
  console.log('访问上传文件:', req.url);
  next();
}, express.static(uploadsDir, {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('multer destination:', uploadsDir);
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = 'template-' + uniqueSuffix + path.extname(file.originalname);
    console.log('multer filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('错误处理中间件:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超过限制' });
    }
    return res.status(400).json({ error: '文件上传错误: ' + err.message });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: '意外的文件字段' });
  }
  res.status(500).json({ error: '服务器错误: ' + err.message });
});

// 初始化模板ID计数器，从现有模板文件中读取最大的templateId
let templateIdCounter = 1;
try {
  const files = fs.readdirSync(templatesDir);
  files.forEach((file) => {
    if (file.endsWith('.json')) {
      const templateId = parseInt(file.replace('.json', ''), 10);
      if (!isNaN(templateId) && templateId >= templateIdCounter) {
        templateIdCounter = templateId + 1;
      }
    }
  });
  console.log('初始化模板ID计数器:', templateIdCounter);
} catch (error) {
  console.error('初始化模板ID计数器失败:', error);
}

function buildDataUrl(file, imageBase64) {
  const mimeType = file.mimetype && file.mimetype.startsWith('image/')
    ? file.mimetype
    : 'image/png';

  return `data:${mimeType};base64,${imageBase64}`;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function uniqueList(items) {
  return Array.from(
    new Set(
      (items || [])
        .filter(Boolean)
        .map((item) => String(item).trim())
        .filter(Boolean)
    )
  );
}

function pickKeywords(text, groups) {
  const normalized = String(text || '').toLowerCase();

  return uniqueList(
    groups.flatMap((group) => {
      const matched = group.triggers.some((trigger) => normalized.includes(trigger));
      return matched ? group.values : [];
    })
  );
}

function ensureAnalysisShape(analysis, styleRequest) {
  const normalized = analysis || {};

  return {
    originalRequest: styleRequest,
    summary: String(normalized.summary || '').trim(),
    styleKeywords: uniqueList(normalized.styleKeywords),
    colorPalette: uniqueList(normalized.colorPalette),
    lightingEffects: uniqueList(normalized.lightingEffects),
    compositionDetails: uniqueList(normalized.compositionDetails),
    textureMaterials: uniqueList(normalized.textureMaterials),
    textRendering: uniqueList(normalized.textRendering),
    visualFocus: uniqueList(normalized.visualFocus),
    negativeConstraints: uniqueList(normalized.negativeConstraints),
    refinementSuggestions: uniqueList(normalized.refinementSuggestions)
  };
}

function buildHeuristicStyleAnalysis(styleRequest) {
  const request = String(styleRequest || '').trim();

  const styleKeywords = pickKeywords(request, [
    { triggers: ['科技', '科幻', '未来', '赛博', '霓虹', 'hud', '数字'], values: ['未来科技感', '赛博朋克', '数字界面', 'UI/UX 视觉'] },
    { triggers: ['极简', '简约', '干净', '留白'], values: ['极简主义', '清爽编排', '信息优先'] },
    { triggers: ['手账', '胶带', '贴纸', '日记'], values: ['手账拼贴', '纸张质感', '生活化装饰'] },
    { triggers: ['复古', '怀旧', '海报', '胶片'], values: ['复古设计', '海报感', '颗粒纹理'] },
    { triggers: ['卡通', '插画', '可爱', '漫画'], values: ['插画风格', '亲和感', '图形化装饰'] },
    { triggers: ['国风', '古风', '东方'], values: ['东方美学', '传统装饰', '雅致排版'] }
  ]);

  const colorPalette = pickKeywords(request, [
    { triggers: ['蓝', '蓝青', '青', '湖蓝', '冰蓝'], values: ['深蓝', '蓝青色', '霓虹青'] },
    { triggers: ['紫', '紫色', '紫罗兰'], values: ['紫罗兰', '霓虹紫'] },
    { triggers: ['粉', '樱花', '桃'], values: ['柔粉色', '珊瑚粉'] },
    { triggers: ['金', '鎏金'], values: ['鎏金色', '暖金色'] },
    { triggers: ['绿', '森林', '薄荷'], values: ['薄荷绿', '森林绿'] },
    { triggers: ['黑', '暗', '夜'], values: ['深黑色', '夜空灰'] },
    { triggers: ['白', '奶油', '米'], values: ['奶油白', '米白色'] }
  ]);

  const lightingEffects = pickKeywords(request, [
    { triggers: ['高对比', '对比强', '强对比'], values: ['高对比度', '亮暗反差明显'] },
    { triggers: ['霓虹', '发光', '辉光'], values: ['霓虹辉光', '边缘发光', '光晕效果'] },
    { triggers: ['柔和', '温柔'], values: ['柔光', '低刺激光影'] },
    { triggers: ['电影', '戏剧'], values: ['电影感光影', '层次分明的明暗'] }
  ]);

  const compositionDetails = pickKeywords(request, [
    { triggers: ['网格', '仪表盘', '控制台', 'hud'], values: ['清晰网格布局', '控制面板式分区', '几何线条装饰'] },
    { triggers: ['极简', '简约'], values: ['留白明确', '信息区块清晰'] },
    { triggers: ['贴纸', '拼贴'], values: ['角标贴纸', '层叠装饰'] },
    { triggers: ['海报', '标题'], values: ['主标题突出', '版式节奏鲜明'] }
  ]);

  const textureMaterials = pickKeywords(request, [
    { triggers: ['霓虹', '科技', '赛博'], values: ['玻璃面板', '数字噪点', '发光描边'] },
    { triggers: ['手账', '纸', '复古'], values: ['纸张纹理', '胶片颗粒', '胶带贴纸'] },
    { triggers: ['金属', '机械'], values: ['金属拉丝', '机械边框'] }
  ]);

  const textRendering = pickKeywords(request, [
    { triggers: ['科技', '赛博', '极简'], values: ['现代无衬线字体气质', '文字边缘锐利', '适合信息面板的排版'] },
    { triggers: ['复古', '古风'], values: ['标题可带装饰感', '正文保持工整易读'] },
    { triggers: ['手账', '卡通'], values: ['标题可适度活泼', '表格正文依然清晰'] }
  ]);

  const visualFocus = [
    '优先保留课表文字信息和时间轴可读性',
    '保持原始表格布局、单元格关系与课程对应位置',
    '风格化重点放在背景、边框、线条、标题气质和装饰元素'
  ];

  const negativeConstraints = [
    '不要新增、删除或改写课程文字',
    '不要打乱表格行列与单元格位置',
    '不要把文字变成手写体、插画或不可辨认的艺术字',
    '不要让表格线消失、弯曲或难以辨认'
  ];

  const refinementSuggestions = [
    '如果首次结果文字偏糊，继续强调高分辨率、文字清晰可读、边缘锐利',
    '如果色彩不够到位，补充高饱和霓虹色或更明确的主辅色说明',
    '如果装饰过多，可强调信息优先、留白和克制的视觉层级'
  ];

  const summary = [
    styleKeywords.length > 0 ? `风格方向聚焦在${styleKeywords.slice(0, 3).join('、')}` : '风格方向尚未完全明确',
    colorPalette.length > 0 ? `主色建议使用${colorPalette.slice(0, 3).join('、')}` : '色彩方案需要模型补足',
    lightingEffects.length > 0 ? `并通过${lightingEffects.slice(0, 2).join('、')}强化视觉冲击` : '整体将优先保证课表信息清晰'
  ].join('，');

  return ensureAnalysisShape({
    summary,
    styleKeywords,
    colorPalette,
    lightingEffects,
    compositionDetails,
    textureMaterials,
    textRendering,
    visualFocus,
    negativeConstraints,
    refinementSuggestions
  }, request);
}

async function analyzeStyleWithQwen(styleRequest, heuristicAnalysis) {
  const response = await axios.post(
    QWEN_CHAT_API_URL,
    {
      model: QWEN_TEXT_MODEL,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: '你是一个资深视觉设计总监。你需要把用户的风格描述拆解成可直接用于图像生成的结构化视觉分析。只输出 JSON，不要输出代码块，不要解释。'
        },
        {
          role: 'user',
          content: [
            `用户想把一张课表图片渲染成特定风格，用户原始描述：${styleRequest}`,
            '请输出 JSON，字段必须包括：summary、styleKeywords、colorPalette、lightingEffects、compositionDetails、textureMaterials、textRendering、visualFocus、negativeConstraints、refinementSuggestions。',
            '每个数组字段请给出 2 到 6 条中文短语，summary 给出 1 句中文总结。',
            '请特别强调：课表文字必须清晰可读，布局不可改变，风格主要体现在背景、边框、配色、材质、装饰和氛围上。',
            `如果用户描述过于简短，请结合以下基础理解补足，但不要偏离：${JSON.stringify(heuristicAnalysis)}`
          ].join('\n')
        }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${QWEN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );

  const content = response.data?.choices?.[0]?.message?.content;
  const parsed = typeof content === 'string' ? safeJsonParse(content) : content;

  if (!parsed) {
    throw new Error('Failed to parse structured style analysis');
  }

  return ensureAnalysisShape(parsed, styleRequest);
}

function mergeAnalyses(primary, fallback, styleRequest) {
  const merged = {
    summary: primary.summary || fallback.summary,
    styleKeywords: uniqueList([...(primary.styleKeywords || []), ...(fallback.styleKeywords || [])]),
    colorPalette: uniqueList([...(primary.colorPalette || []), ...(fallback.colorPalette || [])]),
    lightingEffects: uniqueList([...(primary.lightingEffects || []), ...(fallback.lightingEffects || [])]),
    compositionDetails: uniqueList([...(primary.compositionDetails || []), ...(fallback.compositionDetails || [])]),
    textureMaterials: uniqueList([...(primary.textureMaterials || []), ...(fallback.textureMaterials || [])]),
    textRendering: uniqueList([...(primary.textRendering || []), ...(fallback.textRendering || [])]),
    visualFocus: uniqueList([...(primary.visualFocus || []), ...(fallback.visualFocus || [])]),
    negativeConstraints: uniqueList([...(primary.negativeConstraints || []), ...(fallback.negativeConstraints || [])]),
    refinementSuggestions: uniqueList([...(primary.refinementSuggestions || []), ...(fallback.refinementSuggestions || [])])
  };

  return ensureAnalysisShape(merged, styleRequest);
}

async function evaluateAndOptimizeResult(resultImageUrl, originalAnalysis, styleRequest) {
  try {
    const response = await axios.post(
      QWEN_CHAT_API_URL,
      {
        model: QWEN_TEXT_MODEL,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: '你是一个专业的图像质量评估专家。你需要评估生成的风格化课表图片是否符合要求，并提供优化建议。只输出 JSON，不要输出代码块，不要解释。'
          },
          {
            role: 'user',
            content: [
              `原始风格需求：${styleRequest}`,
              `视觉分析结果：${JSON.stringify(originalAnalysis)}`,
              '请严格评估生成的图片是否符合以下标准：',
              '1. 文字内容是否与原图完全一致，没有任何修改、添加或删除',
              '2. 文字是否清晰可读，是否保持了印刷体质感',
              '3. 表格结构是否与原图完全一致，行列数量、单元格位置、边框线条是否保持不变',
              '4. 表格线条是否保持笔直清晰，位置和粗细是否与原图一致',
              '5. 是否添加或删除了任何内容（包括文字、线条、装饰元素）',
              '6. 背景风格化效果是否符合用户需求',
              '7. 整体视觉效果是否平衡',
              '请输出 JSON，字段必须包括：',
              '- textClarity (number 0-1): 文字清晰度和一致性评分',
              '- textContentMatch (number 0-1): 文字内容完全一致评分',
              '- tableStructureMatch (number 0-1): 表格结构完全一致评分',
              '- lineClarity (number 0-1): 表格线清晰度和一致性评分',
              '- styleMatch (number 0-1): 风格匹配度评分',
              '- overallQuality (number 0-1): 整体质量评分',
              '- needsRefinement (boolean): 是否需要优化',
              '- refinementSuggestions (array): 优化建议列表，每条建议不超过20字',
              '- refinedPrompt (string): 如果需要优化，提供优化后的prompt，必须强调保持文字和表格完全不变'
            ].join('\n')
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${QWEN_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    const evaluation = typeof content === 'string' ? safeJsonParse(content) : content;

    if (!evaluation) {
      throw new Error('Failed to parse evaluation result');
    }

    return evaluation;
  } catch (error) {
    console.warn('Evaluation failed:', error.message);
    return {
      textClarity: 0.8,
      lineClarity: 0.8,
      styleMatch: 0.8,
      overallQuality: 0.8,
      needsRefinement: false,
      refinementSuggestions: [],
      refinedPrompt: null
    };
  }
}

function buildStyleAnalysisV2(styleRequest) {
  const request = String(styleRequest || '').trim();

  const styleKeywords = pickKeywords(request, [
    { triggers: ['科技', '科幻', '未来', '赛博', '霓虹', 'hud', '数字'], values: ['未来科技感', '赛博朋克', '数字界面', 'UI/UX 视觉'] },
    { triggers: ['极简', '简约', '干净', '留白'], values: ['极简主义', '清爽编排', '信息优先'] },
    { triggers: ['手账', '胶带', '贴纸', '日记'], values: ['手账拼贴', '纸张质感', '生活化装饰'] },
    { triggers: ['复古', '怀旧', '海报', '胶片'], values: ['复古设计', '海报感', '颗粒纹理'] },
    { triggers: ['卡通', '插画', '可爱', '漫画'], values: ['插画风格', '亲和感', '图形化装饰'] },
    { triggers: ['国风', '古风', '东方'], values: ['东方美学', '传统装饰', '雅致排版'] }
  ]);

  const colorPalette = pickKeywords(request, [
    { triggers: ['蓝', '蓝青', '青', '湖蓝', '冰蓝'], values: ['深蓝', '蓝青色', '霓虹青'] },
    { triggers: ['紫', '紫色', '紫罗兰'], values: ['紫罗兰', '霓虹紫'] },
    { triggers: ['粉', '樱花', '桃'], values: ['柔粉色', '珊瑚粉'] },
    { triggers: ['金', '鎏金'], values: ['鎏金色', '暖金色'] },
    { triggers: ['绿', '森林', '薄荷'], values: ['薄荷绿', '森林绿'] },
    { triggers: ['黑', '暗', '夜'], values: ['深黑色', '夜空灰'] },
    { triggers: ['白', '奶油', '米'], values: ['奶油白', '米白色'] }
  ]);

  const lightingEffects = pickKeywords(request, [
    { triggers: ['高对比', '对比强', '强对比'], values: ['高对比度', '亮暗反差明显'] },
    { triggers: ['霓虹', '发光', '辉光'], values: ['霓虹辉光', '边缘发光', '光晕效果'] },
    { triggers: ['柔和', '温柔'], values: ['柔光', '低刺激光影'] },
    { triggers: ['电影', '戏剧'], values: ['电影感光影', '层次分明的明暗'] }
  ]);

  const compositionDetails = pickKeywords(request, [
    { triggers: ['网格', '仪表盘', '控制台', 'hud'], values: ['清晰网格布局', '控制面板式分区', '几何线条装饰'] },
    { triggers: ['极简', '简约'], values: ['留白明确', '信息区块清晰'] },
    { triggers: ['贴纸', '拼贴'], values: ['角标贴纸', '层叠装饰'] },
    { triggers: ['海报', '标题'], values: ['主标题突出', '版式节奏鲜明'] }
  ]);

  const textureMaterials = pickKeywords(request, [
    { triggers: ['霓虹', '科技', '赛博'], values: ['玻璃面板', '数字噪点', '发光描边'] },
    { triggers: ['手账', '纸', '复古'], values: ['纸张纹理', '胶片颗粒', '胶带贴纸'] },
    { triggers: ['金属', '机械'], values: ['金属拉丝', '机械边框'] }
  ]);

  const textRendering = pickKeywords(request, [
    { triggers: ['科技', '赛博', '极简'], values: ['现代无衬线字体气质', '文字边缘锐利', '适合信息面板的排版'] },
    { triggers: ['复古', '古风'], values: ['标题可带装饰感', '正文保持工整易读'] },
    { triggers: ['手账', '卡通'], values: ['标题可适度活泼', '表格正文依然清晰'] }
  ]);

  const visualFocus = [
    '优先保留课表文字信息和时间轴可读性',
    '保持原始表格布局、单元格关系与课程对应位置',
    '风格化重点放在背景、边框、线条、标题气质和装饰元素'
  ];

  const negativeConstraints = [
    '不要新增、删除或改写课程文字',
    '不要打乱表格行列与单元格位置',
    '不要把文字变成手写体、插画或不可辨认的艺术字',
    '不要让表格线消失、弯曲或难以辨认'
  ];

  const refinementSuggestions = [
    '如果首次结果文字偏糊，继续强调高分辨率、文字清晰可读、边缘锐利',
    '如果色彩不够到位，补充高饱和霓虹色或更明确的主辅色说明',
    '如果装饰过多，可强调信息优先、留白和克制的视觉层级'
  ];

  const summary = [
    styleKeywords.length > 0 ? `风格方向聚焦在${styleKeywords.slice(0, 3).join('、')}` : '风格方向尚未完全明确',
    colorPalette.length > 0 ? `主色建议使用${colorPalette.slice(0, 3).join('、')}` : '色彩方案需要模型补足',
    lightingEffects.length > 0 ? `并通过${lightingEffects.slice(0, 2).join('、')}强化视觉冲击` : '整体将优先保证课表信息清晰'
  ].join('，');

  return ensureAnalysisShape({
    summary,
    styleKeywords,
    colorPalette,
    lightingEffects,
    compositionDetails,
    textureMaterials,
    textRendering,
    visualFocus,
    negativeConstraints,
    refinementSuggestions
  }, request);
}

async function analyzeStyleWithQwenV2(styleRequest, heuristicAnalysis) {
  const response = await axios.post(
    QWEN_CHAT_API_URL,
    {
      model: QWEN_TEXT_MODEL,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: '你是一个资深视觉设计总监。你需要把用户的风格描述拆解成可直接用于图像生成的结构化视觉分析。只输出 JSON，不要输出代码块，不要解释。'
        },
        {
          role: 'user',
          content: [
            `用户想把一张课表图片渲染成特定风格，用户原始描述：${styleRequest}`,
            '请输出 JSON，字段必须包括：summary、styleKeywords、colorPalette、lightingEffects、compositionDetails、textureMaterials、textRendering、visualFocus、negativeConstraints、refinementSuggestions。',
            '每个数组字段请给出 2 到 6 条中文短语，summary 给出 1 句中文总结。',
            '请特别强调：课表文字必须清晰可读，布局不可改变，风格主要体现在背景、边框、配色、材质、装饰和氛围上。',
            `如果用户描述过于简短，请结合以下基础理解补足，但不要偏离：${JSON.stringify(heuristicAnalysis)}`
          ].join('\n')
        }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${QWEN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );

  const content = response.data?.choices?.[0]?.message?.content;
  const parsed = typeof content === 'string' ? safeJsonParse(content) : content;

  if (!parsed) {
    throw new Error('Failed to parse structured style analysis');
  }

  return ensureAnalysisShape(parsed, styleRequest);
}

function buildImageEditPromptV2(styleRequest, analysis, options = {}) {
  // 从analysis中提取风格信息
  const styleKeywords = analysis.styleKeywords || [];
  const colorPalette = analysis.colorPalette || [];
  const textureMaterials = analysis.textureMaterials || [];
  const textRendering = analysis.textRendering || [];
  
  // 构建视觉风格指令
  const overallStyle = styleKeywords.length > 0 ? styleKeywords.join('、') : styleRequest;
  const colorScheme = colorPalette.length > 0 ? colorPalette.join('、') : '根据风格自动选择';
  const designElements = textureMaterials.length > 0 ? textureMaterials.join('、') : '根据风格自动添加';
  const fontStyle = textRendering.length > 0 ? textRendering.join('、') : '根据风格自动选择';

  return [
    `请将用户上传的课程表图片，转换为一张高分辨率、信息清晰的视觉设计图。要求：更美观、更精致，更清晰、更易读，更具创意、更有趣。“${styleRequest}”风格。`,
    '',
    '核心内容要求（必须保留）：',
    '结构： 严格保留原表的网格结构（星期一至星期五，时间轴，上午/下午分区）。',
    '文字： 所有课程名称（语文、数学、英语等）、时间（8:00-8:45等）和标题（课程表）必须一字不差地还原。文字需要清晰可读，不能有艺术变形导致无法辨认。',
    '布局： 保持原有的行列对应关系，不要打乱课程顺序。',
    '',
    '',
    '视觉风格指令（根据用户输入动态替换）：',
    `整体风格： ${overallStyle}`,
    `色彩搭配： ${colorScheme}`,
    `设计元素： ${designElements}`,
    `字体处理： ${fontStyle}`,
    '',
    '输出质量：',
    '画面精致，细节丰富，无噪点。',
    '文字部分需保持锐利，确保打印或查看时能看清课程安排。',
    '',
    '【重要】重点让文字清晰可读，增强文字和背景的对比度，锐化模糊的边缘，但不要改变表格里的任何课程内容。',
    '【重要】确保文字没有重影。',
    '【重要】使用高对比度配色方案。',
    '【重要】输出高分辨率图片。',
    '【重要】文字必须智能适配背景颜色，深色背景使用浅色文字，浅色背景使用深色文字，确保高对比度和清晰度。',
    '【重要】可以改变文字的字体样式和颜色，但必须保证文字内容完全不出错。'
  ]
    .filter(Boolean)
    .join('\n');
}

function buildImageEditPrompt(styleRequest, analysis, options = {}) {
  // 从analysis中提取风格信息
  const styleKeywords = analysis.styleKeywords || [];
  const colorPalette = analysis.colorPalette || [];
  const textureMaterials = analysis.textureMaterials || [];
  const textRendering = analysis.textRendering || [];
  
  // 构建视觉风格指令
  const overallStyle = styleKeywords.length > 0 ? styleKeywords.join('、') : styleRequest;
  const colorScheme = colorPalette.length > 0 ? colorPalette.join('、') : '根据风格自动选择';
  const designElements = textureMaterials.length > 0 ? textureMaterials.join('、') : '根据风格自动添加';
  const fontStyle = textRendering.length > 0 ? textRendering.join('、') : '根据风格自动选择';

  return [
    `请将用户上传的课程表图片，转换为一张高分辨率、信息清晰的视觉设计图。要求：更美观、更精致，更清晰、更易读，更具创意、更有趣。“${styleRequest}”风格。`,
    '',
    '核心内容要求（必须保留）：',
    '结构： 严格保留原表的网格结构（星期一至星期五，时间轴，上午/下午分区）。',
    '文字： 所有课程名称（语文、数学、英语等）、时间（8:00-8:45等）和标题（课程表）必须一字不差地还原。文字需要清晰可读，不能有艺术变形导致无法辨认。',
    '布局： 保持原有的行列对应关系，不要打乱课程顺序。',
    '',
    '',
    '视觉风格指令（根据用户输入动态替换）：',
    `整体风格： ${overallStyle}`,
    `色彩搭配： ${colorScheme}`,
    `设计元素： ${designElements}`,
    `字体处理： ${fontStyle}`,
    '',
    '输出质量：',
    '画面精致，细节丰富，无噪点。',
    '文字部分需保持锐利，确保打印或查看时能看清课程安排。',
    '',
    '【重要】重点让文字清晰可读，增强文字和背景的对比度，锐化模糊的边缘，但不要改变表格里的任何课程内容。',
    '【重要】确保文字没有重影。',
    '【重要】使用高对比度配色方案。',
    '【重要】输出高分辨率图片。',
    '【重要】文字必须智能适配背景颜色，深色背景使用浅色文字，浅色背景使用深色文字，确保高对比度和清晰度。',
    '【重要】可以改变文字的字体样式和颜色，但必须保证文字内容完全不出错。'
  ]
    .filter(Boolean)
    .join('\n');
}

async function pollDashScopeTask(taskId) {
  const deadline = Date.now() + QWEN_TASK_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const response = await axios.get(`${QWEN_TASK_API_URL}/${taskId}`, {
      headers: {
        Authorization: `Bearer ${QWEN_API_KEY}`
      }
    });

    const output = response.data?.output;
    const taskStatus = output?.task_status;

    if (taskStatus === 'SUCCEEDED') {
      return output;
    }

    if (taskStatus === 'FAILED' || taskStatus === 'CANCELED') {
      throw new Error(output?.message || 'Image edit task failed');
    }

    await new Promise((resolve) => setTimeout(resolve, QWEN_TASK_POLL_INTERVAL_MS));
  }

  throw new Error('Image edit task timed out, please try again later');
}

app.post('/api/upload-template', upload.single('image'), async (req, res) => {
  console.log('开始上传模板...');
  try {
    // 在 multer 解析之后验证管理员权限
    const adminPassword = req.body?.adminPassword;
    console.log('上传模板 - adminPassword:', adminPassword ? '***' : 'undefined');

    if (!ADMIN_PASSWORD) {
      console.error('管理员密码未配置');
      return res.status(500).json({ error: '管理员密码未配置' });
    }

    if (!adminPassword || adminPassword !== ADMIN_PASSWORD) {
      console.error('管理员权限验证失败');
      return res.status(403).json({ error: '需要管理员权限' });
    }

    console.log('管理员权限验证成功');
    console.log('接收到的文件:', req.file);

    if (!req.file) {
      console.error('没有接收到文件');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const templateId = templateIdCounter++;
    const imagePath = `/uploads/${req.file.filename}`;
    const templateName = req.body.name || `模板 #${templateId}`;
    const templateData = {
      templateId,
      name: templateName,
      image: imagePath,
      cells: []
    };

    console.log('保存模板数据:', templateData);
    fs.writeFileSync(
      path.join(templatesDir, `${templateId}.json`),
      JSON.stringify(templateData, null, 2)
    );

    // 如果启用了 Supabase 自动同步，则同步到云端
    if (supabaseClient.isSyncEnabled()) {
      supabaseClient.syncTemplateToSupabase(templateData).catch(err => {
        console.error('后台同步到 Supabase 失败:', err);
      });
    }

    console.log('模板上传成功:', templateId);
    return res.json({
      success: true,
      templateId,
      name: templateName,
      image: imagePath
    });
  } catch (error) {
    console.error('Upload template error:', error);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

app.post('/api/save-template', requireAdminAuth, async (req, res) => {
  try {
    const { templateId, cells } = req.body;

    if (!templateId || !cells) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const templatePath = path.join(templatesDir, `${templateId}.json`);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
    templateData.cells = cells;
    fs.writeFileSync(templatePath, JSON.stringify(templateData, null, 2));

    // 如果启用了 Supabase 自动同步，则同步到云端
    if (supabaseClient.isSyncEnabled()) {
      supabaseClient.syncTemplateToSupabase(templateData).catch(err => {
        console.error('后台同步到 Supabase 失败:', err);
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Save template error:', error);
    return res.status(500).json({ error: 'Save failed' });
  }
});

app.get('/api/templates', async (req, res) => {
  try {
    console.log('获取模板列表...');

    // 如果启用了 Supabase 同步，优先从 Supabase 获取数据
    if (supabaseClient.isSyncEnabled()) {
      console.log('从 Supabase 获取模板列表...');
      const supabaseTemplates = await supabaseClient.getTemplatesFromSupabase();

      if (supabaseTemplates.length > 0) {
        const templates = supabaseTemplates.map(template => ({
          templateId: template.id,
          name: template.name,
          image: template.image_url,
          cellsCount: template.cells_count || 0
        }));
        console.log('从 Supabase 返回的模板列表:', templates);
        return res.json(templates);
      }
    }

    // 如果 Supabase 没有数据或未启用同步，从本地文件系统获取
    console.log('从本地文件系统获取模板列表...');
    console.log('templatesDir:', templatesDir);
    const templates = [];
    const files = fs.readdirSync(templatesDir);
    console.log('找到的文件:', files);

    files.forEach((file) => {
      if (!file.endsWith('.json')) {
        return;
      }

      const templateData = JSON.parse(
        fs.readFileSync(path.join(templatesDir, file), 'utf8')
      );

      templates.push({
        templateId: templateData.templateId,
        name: templateData.name,
        image: templateData.image,
        cellsCount: templateData.cells.length
      });
    });

    console.log('返回的模板列表:', templates);
    return res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    return res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

app.get('/api/template/:id', async (req, res) => {
  try {
    const templateId = req.params.id;

    // 如果启用了 Supabase 同步，优先从 Supabase 获取数据
    if (supabaseClient.isSyncEnabled()) {
      console.log(`从 Supabase 获取模板 #${templateId}...`);
      const templateData = await supabaseClient.getTemplateFromSupabase(templateId);

      if (templateData) {
        console.log(`从 Supabase 返回的模板 #${templateId}:`, templateData);
        return res.json(templateData);
      }
    }

    // 如果 Supabase 没有数据或未启用同步，从本地文件系统获取
    console.log(`从本地文件系统获取模板 #${templateId}...`);
    const templatePath = path.join(templatesDir, `${templateId}.json`);

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
    return res.json(templateData);
  } catch (error) {
    console.error('Get template error:', error);
    return res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// 重命名模板
app.put('/api/template/:id/rename', requireAdminAuth, (req, res) => {
  try {
    const templateId = req.params.id;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: '模板名称不能为空' });
    }

    const templatePath = path.join(templatesDir, `${templateId}.json`);

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: '模板不存在' });
    }

    const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
    templateData.name = name.trim();
    fs.writeFileSync(templatePath, JSON.stringify(templateData, null, 2));

    // 如果启用了 Supabase 自动同步，则同步到云端
    if (supabaseClient.isSyncEnabled()) {
      supabaseClient.syncTemplateToSupabase(templateData).catch(err => {
        console.error('后台同步到 Supabase 失败:', err);
      });
    }

    return res.json({ success: true, name: templateData.name });
  } catch (error) {
    console.error('Rename template error:', error);
    return res.status(500).json({ error: '重命名失败' });
  }
});

// 删除模板
app.delete('/api/template/:id', requireAdminAuth, (req, res) => {
  try {
    const templateId = req.params.id;
    const templatePath = path.join(templatesDir, `${templateId}.json`);

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: '模板不存在' });
    }

    // 读取模板数据以获取图片路径
    const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

    // 删除模板数据文件
    fs.unlinkSync(templatePath);

    // 删除关联的图片文件
    if (templateData.image) {
      const imagePath = path.join(__dirname, templateData.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // 如果启用了 Supabase 自动同步，则从云端删除
    if (supabaseClient.isSyncEnabled()) {
      supabaseClient.deleteTemplateFromSupabase(templateId).catch(err => {
        console.error('从 Supabase 删除失败:', err);
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete template error:', error);
    return res.status(500).json({ error: '删除失败' });
  }
});

app.post('/api/generate-style', upload.single('image'), async (req, res) => {
  try {
    console.log('Received generate-style request');
    console.log('Uploaded file:', req.file);
    console.log('Request body:', req.body);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { style } = req.body;
    const optimizeForReadability = req.body.optimizeForReadability !== 'false';
    if (!style) {
      return res.status(400).json({ error: 'Style is required' });
    }

    if (!QWEN_API_KEY) {
      return res.status(500).json({ error: 'QWEN_API_KEY is not configured' });
    }

    const imageBuffer = fs.readFileSync(req.file.path);
    const imageBase64 = imageBuffer.toString('base64');
    const baseImageUrl = buildDataUrl(req.file, imageBase64);

    const heuristicAnalysis = buildHeuristicStyleAnalysis(style);
    let analysis = heuristicAnalysis;
    let analysisSource = 'heuristic';

    try {
      const aiAnalysis = await analyzeStyleWithQwen(style, heuristicAnalysis);
      analysis = mergeAnalyses(aiAnalysis, heuristicAnalysis, style);
      analysisSource = 'qwen';
    } catch (analysisError) {
      console.warn('Style analysis fallback triggered:', analysisError.message);
    }

    const prompt = buildImageEditPrompt(style, analysis, { optimizeForReadability });

    console.log('步骤1：深度理解用户需求并构建Prompt');
    console.log('优化后的Prompt:', prompt);

    const requestData = {
      model: 'wanx2.1-imageedit',
      input: {
        function: 'stylization_local',
        prompt,
        base_image_url: baseImageUrl
      },
      parameters: {
        n: 1,
        size: '2048*2048',
        style_strength: 1.0,
        quality: 'high',
        sharpness: 2.0
      }
    };

    console.log('步骤2：调用图像模型生成初始结果');

    const createTaskResponse = await axios.post(
      QWEN_IMAGE_EDIT_API_URL,
      requestData,
      {
        headers: {
          Authorization: `Bearer ${QWEN_API_KEY}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable'
        }
      }
    );

    const taskId = createTaskResponse.data?.output?.task_id;
    if (!taskId) {
      throw new Error('DashScope did not return a task ID');
    }

    const output = await pollDashScopeTask(taskId);

    if (!output.results || output.results.length === 0 || !output.results[0].url) {
      throw new Error('No result image returned from DashScope');
    }

    const resultImageUrl = output.results[0].url;
    console.log('步骤3：评估生成结果质量');

    const evaluation = await evaluateAndOptimizeResult(resultImageUrl, analysis, style);
    console.log('评估结果:', JSON.stringify(evaluation, null, 2));

    let finalImageUrl = resultImageUrl;
    let finalPrompt = prompt;
    let usedRefinement = false;

    // 如果需要优化且提供了优化后的prompt，进行二次生成
    if (evaluation.needsRefinement && evaluation.refinedPrompt) {
      console.log('步骤4：根据评估结果优化Prompt并重新生成');
      console.log('优化后的Prompt:', evaluation.refinedPrompt);

      const refinedRequestData = {
        model: 'wanx2.1-imageedit',
        input: {
          function: 'stylization_local',
          prompt: evaluation.refinedPrompt,
          base_image_url: baseImageUrl
        },
        parameters: {
          n: 1,
          size: '2048*2048',
          style_strength: 0.5,
          quality: 'high',
          sharpness: 1.2
        }
      };

      const refinedTaskResponse = await axios.post(
        QWEN_IMAGE_EDIT_API_URL,
        refinedRequestData,
        {
          headers: {
            Authorization: `Bearer ${QWEN_API_KEY}`,
            'Content-Type': 'application/json',
            'X-DashScope-Async': 'enable'
          }
        }
      );

      const refinedTaskId = refinedTaskResponse.data?.output?.task_id;
      if (refinedTaskId) {
        const refinedOutput = await pollDashScopeTask(refinedTaskId);
        if (refinedOutput.results && refinedOutput.results.length > 0 && refinedOutput.results[0].url) {
          finalImageUrl = refinedOutput.results[0].url;
          finalPrompt = evaluation.refinedPrompt;
          usedRefinement = true;
          console.log('步骤5：输出最终优化后的图像');
        }
      }
    } else {
      console.log('步骤4：输出最终图像（无需优化）');
    }

    const imageResponse = await axios.get(finalImageUrl, { responseType: 'arraybuffer' });
    const generatedFileName = `styled-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
    const generatedImagePath = path.join(uploadsDir, generatedFileName);

    fs.writeFileSync(generatedImagePath, imageResponse.data);

    return res.json({
      success: true,
      analysisSource,
      analysis,
      optimizedPrompt: finalPrompt,
      originalImage: `/uploads/${req.file.filename}`,
      styledImage: `/uploads/${generatedFileName}`,
      evaluation: {
        textClarity: evaluation.textClarity,
        textContentMatch: evaluation.textContentMatch,
        tableStructureMatch: evaluation.tableStructureMatch,
        lineClarity: evaluation.lineClarity,
        styleMatch: evaluation.styleMatch,
        overallQuality: evaluation.overallQuality,
        refinementSuggestions: evaluation.refinementSuggestions
      },
      usedRefinement
    });
  } catch (error) {
    console.error('Generate style error:', error);
    if (error.response) {
      console.error('API response status:', error.response.status);
      console.error('API response data:', JSON.stringify(error.response.data, null, 2));
    }

    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error?.message ||
      error.message ||
      'Failed to generate styled image';

    return res.status(500).json({ error: errorMessage });
  }
});

// 只在本地开发时启动服务器
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`API key configured: ${QWEN_API_KEY ? 'yes' : 'no'}`);
    console.log(`Admin password configured: ${ADMIN_PASSWORD ? 'yes' : 'no'}`);
  });

  // 增加超时时间
  server.timeout = 300000; // 5分钟
  server.keepAliveTimeout = 65000; // 65秒
  server.headersTimeout = 66000; // 66秒
}

// 导出 Express 应用供 Vercel 使用
module.exports = app;


// ============================================
// 管理员权限验证 API（轻量级，无需登录）
// ============================================

/**
 * 验证管理员密码
 */
app.post('/api/admin/verify', (req, res) => {
  try {
    const { password } = req.body;
    
    console.log('收到密码验证请求');
    console.log('输入的密码:', password);
    console.log('配置的ADMIN_PASSWORD:', ADMIN_PASSWORD ? '已设置' : '未设置');
    
    if (!password) {
      console.log('错误：未提供密码');
      return res.status(400).json({ 
        success: false,
        error: '请输入密码' 
      });
    }
    
    // 如果没有设置管理员密码，默认允许访问（开发模式）
    if (!ADMIN_PASSWORD) {
      console.log('警告：未设置ADMIN_PASSWORD，允许访问（开发模式）');
      return res.json({
        success: true,
        message: '管理员模式已启用（未设置密码）'
      });
    }
    
    // 验证密码
    if (password === ADMIN_PASSWORD) {
      console.log('密码验证成功！');
      return res.json({
        success: true,
        message: '验证成功，管理员模式已启用'
      });
    } else {
      console.log('密码验证失败：密码不匹配');
      return res.status(401).json({
        success: false,
        error: '密码错误'
      });
    }
  } catch (error) {
    console.error('验证管理员密码失败:', error);
    return res.status(500).json({ 
      success: false,
      error: '验证失败' 
    });
  }
});

/**
 * 检查是否配置了管理员密码
 */
app.get('/api/admin/config', (req, res) => {
  return res.json({
    success: true,
    hasPassword: !!ADMIN_PASSWORD
  });
});


// ============================================
// Supabase 相关 API 路由
// ============================================

/**
 * 检查 Supabase 连接状态
 */
app.get('/api/supabase/status', (req, res) => {
  try {
    const available = supabaseClient.isSupabaseAvailable();
    const syncEnabled = supabaseClient.isSyncEnabled();
    
    return res.json({
      success: true,
      available,
      syncEnabled,
      message: available 
        ? (syncEnabled ? 'Supabase 已连接并启用自动同步' : 'Supabase 已连接但未启用自动同步')
        : 'Supabase 未配置'
    });
  } catch (error) {
    console.error('检查 Supabase 状态失败:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to check Supabase status' 
    });
  }
});

/**
 * 切换自动同步开关
 */
app.post('/api/supabase/toggle-sync', (req, res) => {
  try {
    const { enable } = req.body;
    
    if (typeof enable !== 'boolean') {
      return res.status(400).json({ error: 'Invalid parameter: enable must be boolean' });
    }
    
    // 更新环境变量（注意：这只会影响当前进程）
    process.env.ENABLE_SUPABASE_SYNC = enable ? 'true' : 'false';
    
    return res.json({
      success: true,
      syncEnabled: enable,
      message: `自动同步已${enable ? '开启' : '关闭'}`
    });
  } catch (error) {
    console.error('切换同步开关失败:', error);
    return res.status(500).json({ error: 'Failed to toggle sync' });
  }
});

/**
 * 同步单个模板到 Supabase
 */
app.post('/api/supabase/sync-template', async (req, res) => {
  try {
    const { templateId } = req.body;
    
    if (!templateId) {
      return res.status(400).json({ error: 'Missing templateId' });
    }
    
    // 从本地文件读取模板数据
    const templatePath = path.join(templatesDir, `${templateId}.json`);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
    
    // 同步到 Supabase
    const result = await supabaseClient.syncTemplateToSupabase(templateData);
    
    if (result) {
      return res.json({
        success: true,
        message: '模板已成功同步到 Supabase',
        data: result
      });
    } else {
      return res.status(500).json({
        success: false,
        message: '同步失败，请检查 Supabase 配置'
      });
    }
  } catch (error) {
    console.error('同步模板失败:', error);
    return res.status(500).json({ error: 'Failed to sync template' });
  }
});

/**
 * 批量同步所有模板到 Supabase
 */
app.post('/api/supabase/sync-all', async (req, res) => {
  try {
    // 读取所有本地模板
    const templates = [];
    const files = fs.readdirSync(templatesDir);
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const templateData = JSON.parse(
          fs.readFileSync(path.join(templatesDir, file), 'utf8')
        );
        templates.push(templateData);
      } catch (err) {
        console.error(`读取模板文件 ${file} 失败:`, err);
      }
    }
    
    if (templates.length === 0) {
      return res.json({
        success: true,
        message: '没有可同步的模板',
        stats: { success: 0, failed: 0, total: 0 }
      });
    }
    
    // 批量同步
    const stats = await supabaseClient.syncAllTemplatesToSupabase(templates);
    
    return res.json({
      success: true,
      message: `批量同步完成: 成功 ${stats.success}, 失败 ${stats.failed}`,
      stats
    });
  } catch (error) {
    console.error('批量同步失败:', error);
    return res.status(500).json({ error: 'Failed to sync all templates' });
  }
});

/**
 * 从 Supabase 获取模板列表（可选，用于对比或迁移）
 */
app.get('/api/supabase/templates', async (req, res) => {
  try {
    const templates = await supabaseClient.getTemplatesFromSupabase();
    
    return res.json({
      success: true,
      count: templates.length,
      templates
    });
  } catch (error) {
    console.error('从 Supabase 获取模板列表失败:', error);
    return res.status(500).json({ error: 'Failed to fetch templates from Supabase' });
  }
});

/**
 * 从 Supabase 获取单个模板详情
 */
app.get('/api/supabase/template/:id', async (req, res) => {
  try {
    const templateId = req.params.id;
    const template = await supabaseClient.getTemplateFromSupabase(templateId);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found in Supabase' });
    }
    
    return res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('从 Supabase 获取模板详情失败:', error);
    return res.status(500).json({ error: 'Failed to fetch template from Supabase' });
  }
});

