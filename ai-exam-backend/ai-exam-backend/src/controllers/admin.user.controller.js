const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

const SALT_ROUNDS = 12;

// @desc    Get all users (with pagination, search, filter)
// @route   GET /api/admin/users
// @access  Admin
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      deletedAt: null,
      AND: []
    };

    if (search) {
      where.AND.push({
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { className: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    if (role && ['student', 'teacher', 'admin'].includes(role)) {
      where.AND.push({ role });
    }

    if (isActive !== undefined) {
      where.AND.push({ isActive: isActive === 'true' });
    }

    if (where.AND.length === 0) {
      delete where.AND;
    }

    const orderBy = {};
    const validSortFields = ['createdAt', 'fullName', 'email', 'role'];
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          className: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              studentExamResults: true,
              createdExams: true,
              createdQuestions: true
            }
          }
        },
        orderBy,
        skip,
        take: limitNum
      }),
      prisma.user.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      status: 'success',
      data: {
        users: users.map(user => ({
          ...user,
          stats: {
            totalExamsTaken: user._count.studentExamResults,
            totalExamsCreated: user._count.createdExams,
            totalQuestionsCreated: user._count.createdQuestions
          },
          _count: undefined
        })),
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('GetAllUsers error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi lấy danh sách người dùng'
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Admin
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID không hợp lệ'
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        className: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            studentExamResults: true,
            createdExams: true,
            createdQuestions: true
          }
        },
        studentExamResults: {
          select: {
            id: true,
            totalScore: true,
            submittedAt: true,
            exam: {
              select: {
                id: true,
                title: true
              }
            }
          },
          orderBy: { submittedAt: 'desc' },
          take: 5
        },
        createdExams: {
          select: {
            id: true,
            title: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
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
          totalExamsCreated: user._count.createdExams,
          totalQuestionsCreated: user._count.createdQuestions
        },
        recentExamResults: user.studentExamResults,
        recentCreatedExams: user.createdExams,
        _count: undefined,
        studentExamResults: undefined,
        createdExams: undefined
      }
    });
  } catch (error) {
    console.error('GetUserById error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi lấy thông tin người dùng'
    });
  }
};

// @desc    Create new user
// @route   POST /api/admin/users
// @access  Admin
const createUser = async (req, res) => {
  try {
    const { email, password, fullName, role, className, isActive = true } = req.body;

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng điền đầy đủ thông tin: email, password, fullName, role'
      });
    }

    if (!['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: 'Role phải là "student", "teacher" hoặc "admin"'
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
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      if (existingUser.deletedAt) {
        return res.status(409).json({
          status: 'error',
          message: 'Email này đã được sử dụng bởi một tài khoản đã bị xóa. Vui lòng liên hệ admin để khôi phục hoặc sử dụng email khác.'
        });
      }
      return res.status(409).json({
        status: 'error',
        message: 'Email đã được sử dụng'
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        fullName,
        role,
        className: role === 'student' ? className : null,
        isActive
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        className: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Tạo người dùng thành công',
      data: user
    });
  } catch (error) {
    console.error('CreateUser error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi tạo người dùng'
    });
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Admin
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const { email, password, fullName, role, className, isActive } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID không hợp lệ'
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy người dùng'
      });
    }

    const updateData = {};

    if (fullName) {
      updateData.fullName = fullName;
    }

    if (email && email.toLowerCase() !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });
      if (emailExists) {
        return res.status(409).json({
          status: 'error',
          message: 'Email đã được sử dụng'
        });
      }
      updateData.email = email.toLowerCase();
    }

    if (role && ['student', 'teacher', 'admin'].includes(role)) {
      updateData.role = role;
    }

    if (className !== undefined) {
      updateData.className = className;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          status: 'error',
          message: 'Mật khẩu phải có ít nhất 6 ký tự'
        });
      }
      updateData.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      updateData.refreshToken = null;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Không có thông tin cần cập nhật'
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        className: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      status: 'success',
      message: 'Cập nhật người dùng thành công',
      data: user
    });
  } catch (error) {
    console.error('UpdateUser error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi cập nhật người dùng'
    });
  }
};

// @desc    Toggle user status (lock/unlock)
// @route   PATCH /api/admin/users/:id/status
// @access  Admin
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const { isActive } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID không hợp lệ'
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng cung cấp isActive (true/false)'
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy người dùng'
      });
    }

    if (existingUser.id === req.user.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Không thể thay đổi trạng thái của chính mình'
      });
    }

    const updateData = { isActive };
    
    if (!isActive) {
      updateData.refreshToken = null;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    res.json({
      status: 'success',
      message: isActive ? 'Mở khóa tài khoản thành công' : 'Khóa tài khoản thành công',
      data: user
    });
  } catch (error) {
    console.error('ToggleUserStatus error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi thay đổi trạng thái người dùng'
    });
  }
};

// @desc    Soft delete user
// @route   DELETE /api/admin/users/:id
// @access  Admin
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID không hợp lệ'
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy người dùng'
      });
    }

    if (existingUser.id === req.user.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Không thể xóa chính mình'
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false,
        refreshToken: null
      }
    });

    res.json({
      status: 'success',
      message: 'Xóa người dùng thành công'
    });
  } catch (error) {
    console.error('DeleteUser error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi xóa người dùng'
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser
};
