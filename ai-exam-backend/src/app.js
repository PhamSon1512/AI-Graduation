const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// Middlewares cơ bản
app.use(cors()); // Cho phép React gọi API
app.use(helmet()); // Bảo mật HTTP headers
app.use(morgan('dev')); // Log request ra console
app.use(express.json()); // Đọc body JSON từ request
app.use(express.urlencoded({ extended: true }));

// API Health Check (Rất cần khi deploy để server biết app còn sống không)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Hệ thống AI Exam đang hoạt động!' });
});

// Nơi đăng ký các Routes sau này
// app.use('/api/exams', examRoutes);
// app.use('/api/ai', aiRoutes);

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