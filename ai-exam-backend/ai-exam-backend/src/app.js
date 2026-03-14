const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Import routes
const authRoutes = require('./routes/auth.routes');
const questionRoutes = require('./routes/question.routes');
const adminUserRoutes = require('./routes/admin.user.routes');
const subjectRoutes = require('./routes/subject.routes');
const examRoutes = require('./routes/exam.routes');
const adminExamRoutes = require('./routes/admin.exam.routes');
const classRoutes = require('./routes/class.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();

// CORS Configuration
// FRONTEND_URL có thể là 1 URL hoặc nhiều URL cách nhau bởi dấu phẩy (vd: http://localhost:5173,https://fe-deploy.pages.dev)
const frontendUrls = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(u => u.trim())
  .filter(Boolean);
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://ai-graduation-fe.pages.dev',
  ...frontendUrls
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(null, true); // Temporarily allow all for debugging
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middlewares cơ bản
app.use(cors(corsOptions));
app.use(helmet({
  contentSecurityPolicy: false, // Tắt CSP để Swagger UI hoạt động
  crossOriginEmbedderPolicy: false
}));
app.use(morgan('dev')); // Log request ra console
app.use(express.json()); // Đọc body JSON từ request
app.use(express.urlencoded({ extended: true }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AI Exam API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true
  }
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Kiểm tra trạng thái hệ thống
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Hệ thống hoạt động bình thường
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Hệ thống AI Exam đang hoạt động!
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Hệ thống AI Exam đang hoạt động!' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api', subjectRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/admin/exams', adminExamRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/ai', aiRoutes);

// Xử lý Route không tồn tại
app.use((req, res, next) => {
  res.status(404).json({ status: 'error', message: 'Không tìm thấy API' });
});

// Middleware xử lý lỗi tổng
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: 'error', message: 'Lỗi Server Nội bộ' });
});

module.exports = app;