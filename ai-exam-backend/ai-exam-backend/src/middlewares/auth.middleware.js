const { verifyAccessToken } = require('../config/jwt');
const prisma = require('../config/prisma');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Không tìm thấy token xác thực. Vui lòng đăng nhập.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({
        status: 'error',
        message: 'Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        className: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Người dùng không tồn tại.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Lỗi xác thực.'
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Chưa xác thực.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền truy cập tài nguyên này.'
      });
    }

    next();
  };
};

const isTeacher = authorizeRoles('teacher');
const isStudent = authorizeRoles('student');

module.exports = {
  authenticate,
  authorizeRoles,
  isTeacher,
  isStudent
};
