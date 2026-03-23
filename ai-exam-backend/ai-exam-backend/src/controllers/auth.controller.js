const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { generateTokenPair, verifyRefreshToken } = require('../config/jwt');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../services/email.service');

// 10–12: cân bằng CPU (đăng nhập/đăng ký) và độ khó brute-force. Override bằng BCRYPT_ROUNDS trong .env
const SALT_ROUNDS = Math.min(
  12,
  Math.max(10, parseInt(process.env.BCRYPT_ROUNDS || '10', 10) || 10)
);

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { email, password, fullName, role, className } = req.body;
    const emailNorm = normalizeEmail(email);

    if (!emailNorm || !password || !fullName || !role) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng điền đầy đủ thông tin: email, password, fullName, role'
      });
    }

    if (!['student', 'teacher'].includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: 'Role phải là "student" hoặc "teacher"'
      });
    }

    if (role === 'student' && !className) {
      return res.status(400).json({
        status: 'error',
        message: 'Học sinh cần cung cấp tên lớp (className)'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Mật khẩu phải có ít nhất 6 ký tự'
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: emailNorm }
    });

    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'Email đã được sử dụng'
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: emailNorm,
        passwordHash,
        fullName,
        role,
        className: role === 'student' ? className : null
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        className: true,
        createdAt: true
      }
    });

    const tokens = generateTokenPair(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken }
    });

    sendWelcomeEmail(user.email, user.fullName).catch(console.error);

    res.status(201).json({
      status: 'success',
      message: 'Đăng ký thành công',
      data: {
        user,
        ...tokens
      }
    });
  } catch (error) {
    // Hai request đăng ký cùng email cùng lúc: cả hai đều qua findUnique, một create thành công → P2002
    if (error.code === 'P2002' && error.meta?.modelName === 'User') {
      return res.status(409).json({
        status: 'error',
        message: 'Email đã được sử dụng'
      });
    }
    console.error('Register error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi đăng ký'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng nhập email và mật khẩu'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizeEmail(email) }
    });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    const tokens = generateTokenPair(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken }
    });

    res.json({
      status: 'success',
      message: 'Đăng nhập thành công',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          className: user.className,
          createdAt: user.createdAt
        },
        ...tokens
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi đăng nhập'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshToken: null }
    });

    res.json({
      status: 'success',
      message: 'Đăng xuất thành công'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi đăng xuất'
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        className: true,
        createdAt: true,
        _count: {
          select: {
            studentExamResults: true,
            createdExams: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy người dùng'
      });
    }

    res.json({
      status: 'success',
      data: {
        ...user,
        stats: {
          totalExamsTaken: user._count.studentExamResults,
          totalExamsCreated: user._count.createdExams
        },
        _count: undefined
      }
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server'
    });
  }
};

// @desc    Update current user profile
// @route   PUT /api/auth/me
// @access  Private
const updateMe = async (req, res) => {
  try {
    const { fullName, className } = req.body;
    const updateData = {};

    if (fullName) {
      updateData.fullName = fullName;
    }

    if (className !== undefined && req.user.role === 'student') {
      updateData.className = className;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Không có thông tin cần cập nhật'
      });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        className: true,
        createdAt: true
      }
    });

    res.json({
      status: 'success',
      message: 'Cập nhật thông tin thành công',
      data: user
    });
  } catch (error) {
    console.error('UpdateMe error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi cập nhật thông tin'
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng nhập đầy đủ mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Mật khẩu mới và xác nhận mật khẩu không khớp'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Mật khẩu hiện tại không đúng'
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        passwordHash: newPasswordHash,
        refreshToken: null
      }
    });

    res.json({
      status: 'success',
      message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.'
    });
  } catch (error) {
    console.error('ChangePassword error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi đổi mật khẩu'
    });
  }
};

// @desc    Forgot password - Send reset email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng nhập email'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizeEmail(email) }
    });

    if (!user) {
      return res.json({
        status: 'success',
        message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được email hướng dẫn đặt lại mật khẩu.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetTokenHash,
        resetTokenExpiry
      }
    });

    await sendPasswordResetEmail(user.email, resetToken, user.fullName);

    res.json({
      status: 'success',
      message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được email hướng dẫn đặt lại mật khẩu.'
    });
  } catch (error) {
    console.error('ForgotPassword error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi xử lý yêu cầu'
    });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng cung cấp đầy đủ thông tin: token, newPassword, confirmPassword'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Mật khẩu mới và xác nhận mật khẩu không khớp'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      });
    }

    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetToken: resetTokenHash,
        resetTokenExpiry: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Token không hợp lệ hoặc đã hết hạn'
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        resetToken: null,
        resetTokenExpiry: null,
        refreshToken: null
      }
    });

    res.json({
      status: 'success',
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.'
    });
  } catch (error) {
    console.error('ResetPassword error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi đặt lại mật khẩu'
    });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'Refresh token không được cung cấp'
      });
    }

    const decoded = verifyRefreshToken(token);

    if (!decoded) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token không hợp lệ hoặc đã hết hạn'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token không hợp lệ'
      });
    }

    const tokens = generateTokenPair(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken }
    });

    res.json({
      status: 'success',
      message: 'Làm mới token thành công',
      data: tokens
    });
  } catch (error) {
    console.error('RefreshToken error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi làm mới token'
    });
  }
};

// @desc    Verify token is valid
// @route   GET /api/auth/verify
// @access  Private
const verifyToken = async (req, res) => {
  res.json({
    status: 'success',
    message: 'Token hợp lệ',
    data: {
      user: req.user
    }
  });
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  verifyToken
};
