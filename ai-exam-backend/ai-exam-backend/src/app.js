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

const app = express();

// Middlewares cơ bản
app.use(cors()); // Cho phép React gọi API
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

// Nơi đăng ký các Routes sau này
// app.use('/api/exams', examRoutes);

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