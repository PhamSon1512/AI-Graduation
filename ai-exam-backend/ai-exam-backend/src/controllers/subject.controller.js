const prisma = require('../config/prisma');

// ==================== SUBJECT CRUD (Admin) ====================

// @desc    Get all subjects
// @route   GET /api/subjects
// @access  All (authenticated)
const getAllSubjects = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const orderBy = {};
    const validSortFields = ['createdAt', 'name', 'code'];
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [subjects, totalCount] = await Promise.all([
      prisma.subject.findMany({
        where,
        include: {
          _count: {
            select: {
              teacherSubjects: true,
              studentSubjects: true
            }
          }
        },
        orderBy,
        skip,
        take: limitNum
      }),
      prisma.subject.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      status: 'success',
      data: {
        subjects: subjects.map(s => ({
          ...s,
          stats: {
            totalTeachers: s._count.teacherSubjects,
            totalStudents: s._count.studentSubjects
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
    console.error('GetAllSubjects error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi lấy danh sách môn học'
    });
  }
};

// @desc    Get subject by ID
// @route   GET /api/subjects/:id
// @access  All (authenticated)
const getSubjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const subjectId = parseInt(id);

    if (isNaN(subjectId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID không hợp lệ'
      });
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        teacherSubjects: {
          include: {
            teacher: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          }
        },
        studentSubjects: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                email: true,
                className: true
              }
            }
          },
          take: 10
        },
        _count: {
          select: {
            teacherSubjects: true,
            studentSubjects: true
          }
        }
      }
    });

    if (!subject) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy môn học'
      });
    }

    res.json({
      status: 'success',
      data: {
        ...subject,
        teachers: subject.teacherSubjects.map(ts => ts.teacher),
        recentStudents: subject.studentSubjects.map(ss => ss.student),
        stats: {
          totalTeachers: subject._count.teacherSubjects,
          totalStudents: subject._count.studentSubjects
        },
        teacherSubjects: undefined,
        studentSubjects: undefined,
        _count: undefined
      }
    });
  } catch (error) {
    console.error('GetSubjectById error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi lấy thông tin môn học'
    });
  }
};

// @desc    Create new subject
// @route   POST /api/subjects
// @access  Admin
const createSubject = async (req, res) => {
  try {
    const { code, name, description } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng cung cấp mã môn (code) và tên môn (name)'
      });
    }

    const existingSubject = await prisma.subject.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (existingSubject) {
      return res.status(409).json({
        status: 'error',
        message: 'Mã môn học đã tồn tại'
      });
    }

    const subject = await prisma.subject.create({
      data: {
        code: code.toUpperCase(),
        name,
        description: description || null,
        isActive: true
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Tạo môn học thành công',
      data: subject
    });
  } catch (error) {
    console.error('CreateSubject error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi tạo môn học'
    });
  }
};

// @desc    Update subject
// @route   PUT /api/subjects/:id
// @access  Admin
const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const subjectId = parseInt(id);
    const { code, name, description, isActive } = req.body;

    if (isNaN(subjectId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID không hợp lệ'
      });
    }

    const existingSubject = await prisma.subject.findUnique({
      where: { id: subjectId }
    });

    if (!existingSubject) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy môn học'
      });
    }

    const updateData = {};

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (code && code.toUpperCase() !== existingSubject.code) {
      const codeExists = await prisma.subject.findUnique({
        where: { code: code.toUpperCase() }
      });
      if (codeExists) {
        return res.status(409).json({
          status: 'error',
          message: 'Mã môn học đã tồn tại'
        });
      }
      updateData.code = code.toUpperCase();
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Không có thông tin cần cập nhật'
      });
    }

    const subject = await prisma.subject.update({
      where: { id: subjectId },
      data: updateData
    });

    res.json({
      status: 'success',
      message: 'Cập nhật môn học thành công',
      data: subject
    });
  } catch (error) {
    console.error('UpdateSubject error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi cập nhật môn học'
    });
  }
};

// @desc    Toggle subject status (hide/show)
// @route   PATCH /api/subjects/:id/status
// @access  Admin
const toggleSubjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const subjectId = parseInt(id);
    const { isActive } = req.body;

    if (isNaN(subjectId)) {
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

    const existingSubject = await prisma.subject.findUnique({
      where: { id: subjectId }
    });

    if (!existingSubject) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy môn học'
      });
    }

    const subject = await prisma.subject.update({
      where: { id: subjectId },
      data: { isActive }
    });

    res.json({
      status: 'success',
      message: isActive ? 'Hiển thị môn học thành công' : 'Ẩn môn học thành công',
      data: subject
    });
  } catch (error) {
    console.error('ToggleSubjectStatus error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi thay đổi trạng thái môn học'
    });
  }
};

// ==================== TEACHER SUBJECT REGISTRATION ====================

// @desc    Teacher register to teach a subject
// @route   POST /api/teachers/:id/subjects
// @access  Teacher (own) or Admin
const teacherRegisterSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = parseInt(id);
    const { subjectId } = req.body;

    if (isNaN(teacherId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID giáo viên không hợp lệ'
      });
    }

    if (!subjectId) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng cung cấp subjectId'
      });
    }

    // Check permission: only own teacher or admin
    if (req.user.role !== 'admin' && req.user.id !== teacherId) {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn chỉ có thể đăng ký môn dạy cho chính mình'
      });
    }

    // Check teacher exists and is a teacher
    const teacher = await prisma.user.findFirst({
      where: {
        id: teacherId,
        role: 'teacher',
        deletedAt: null,
        isActive: true
      }
    });

    if (!teacher) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy giáo viên hoặc tài khoản không hoạt động'
      });
    }

    // Check subject exists and is active
    const subject = await prisma.subject.findFirst({
      where: {
        id: parseInt(subjectId),
        isActive: true
      }
    });

    if (!subject) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy môn học hoặc môn học đã bị ẩn'
      });
    }

    // Check if already registered
    const existing = await prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId: {
          teacherId,
          subjectId: parseInt(subjectId)
        }
      }
    });

    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: 'Giáo viên đã đăng ký môn học này'
      });
    }

    const teacherSubject = await prisma.teacherSubject.create({
      data: {
        teacherId,
        subjectId: parseInt(subjectId)
      },
      include: {
        subject: true
      }
    });

    res.status(201).json({
      status: 'success',
      message: `Đăng ký dạy môn "${subject.name}" thành công`,
      data: teacherSubject
    });
  } catch (error) {
    console.error('TeacherRegisterSubject error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi đăng ký môn dạy'
    });
  }
};

// @desc    Get teacher's registered subjects
// @route   GET /api/teachers/:id/subjects
// @access  Teacher (own) or Admin
const getTeacherSubjects = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = parseInt(id);

    if (isNaN(teacherId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID giáo viên không hợp lệ'
      });
    }

    // Check permission
    if (req.user.role !== 'admin' && req.user.id !== teacherId) {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền xem thông tin này'
      });
    }

    const teacherSubjects = await prisma.teacherSubject.findMany({
      where: { teacherId },
      include: {
        subject: true
      },
      orderBy: { assignedAt: 'desc' }
    });

    res.json({
      status: 'success',
      data: {
        subjects: teacherSubjects.map(ts => ({
          ...ts.subject,
          assignedAt: ts.assignedAt
        })),
        totalCount: teacherSubjects.length
      }
    });
  } catch (error) {
    console.error('GetTeacherSubjects error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi lấy danh sách môn dạy'
    });
  }
};

// @desc    Teacher unregister from a subject
// @route   DELETE /api/teachers/:id/subjects/:subjectId
// @access  Teacher (own) or Admin
const teacherUnregisterSubject = async (req, res) => {
  try {
    const { id, subjectId } = req.params;
    const teacherId = parseInt(id);
    const subId = parseInt(subjectId);

    if (isNaN(teacherId) || isNaN(subId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID không hợp lệ'
      });
    }

    if (req.user.role !== 'admin' && req.user.id !== teacherId) {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn chỉ có thể hủy đăng ký môn dạy của chính mình'
      });
    }

    const existing = await prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId: {
          teacherId,
          subjectId: subId
        }
      }
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy đăng ký môn dạy này'
      });
    }

    await prisma.teacherSubject.delete({
      where: {
        teacherId_subjectId: {
          teacherId,
          subjectId: subId
        }
      }
    });

    res.json({
      status: 'success',
      message: 'Hủy đăng ký môn dạy thành công'
    });
  } catch (error) {
    console.error('TeacherUnregisterSubject error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi hủy đăng ký môn dạy'
    });
  }
};

// ==================== STUDENT SUBJECT ENROLLMENT ====================

// @desc    Student enroll in a subject
// @route   POST /api/students/:id/subjects
// @access  Student (own) or Admin
const studentEnrollSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = parseInt(id);
    const { subjectId } = req.body;

    if (isNaN(studentId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID học sinh không hợp lệ'
      });
    }

    if (!subjectId) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng cung cấp subjectId'
      });
    }

    // Check permission: only own student or admin
    if (req.user.role !== 'admin' && req.user.id !== studentId) {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn chỉ có thể chọn môn học cho chính mình'
      });
    }

    // Check student exists
    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        role: 'student',
        deletedAt: null,
        isActive: true
      }
    });

    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy học sinh hoặc tài khoản không hoạt động'
      });
    }

    // Check subject exists and is active
    const subject = await prisma.subject.findFirst({
      where: {
        id: parseInt(subjectId),
        isActive: true
      }
    });

    if (!subject) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy môn học hoặc môn học đã bị ẩn'
      });
    }

    // Check if already enrolled
    const existing = await prisma.studentSubject.findUnique({
      where: {
        studentId_subjectId: {
          studentId,
          subjectId: parseInt(subjectId)
        }
      }
    });

    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: 'Học sinh đã đăng ký môn học này'
      });
    }

    const studentSubject = await prisma.studentSubject.create({
      data: {
        studentId,
        subjectId: parseInt(subjectId)
      },
      include: {
        subject: true
      }
    });

    res.status(201).json({
      status: 'success',
      message: `Đăng ký môn "${subject.name}" thành công`,
      data: studentSubject
    });
  } catch (error) {
    console.error('StudentEnrollSubject error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi đăng ký môn học'
    });
  }
};

// @desc    Get student's enrolled subjects
// @route   GET /api/students/:id/subjects
// @access  Student (own), Teacher, or Admin
const getStudentSubjects = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = parseInt(id);

    if (isNaN(studentId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID học sinh không hợp lệ'
      });
    }

    // Check permission
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền xem thông tin này'
      });
    }

    const studentSubjects = await prisma.studentSubject.findMany({
      where: { studentId },
      include: {
        subject: true
      },
      orderBy: { enrolledAt: 'desc' }
    });

    res.json({
      status: 'success',
      data: {
        subjects: studentSubjects.map(ss => ({
          ...ss.subject,
          enrolledAt: ss.enrolledAt
        })),
        totalCount: studentSubjects.length
      }
    });
  } catch (error) {
    console.error('GetStudentSubjects error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi lấy danh sách môn học'
    });
  }
};

// @desc    Student unenroll from a subject
// @route   DELETE /api/students/:id/subjects/:subjectId
// @access  Student (own) or Admin
const studentUnenrollSubject = async (req, res) => {
  try {
    const { id, subjectId } = req.params;
    const studentId = parseInt(id);
    const subId = parseInt(subjectId);

    if (isNaN(studentId) || isNaN(subId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID không hợp lệ'
      });
    }

    if (req.user.role !== 'admin' && req.user.id !== studentId) {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn chỉ có thể hủy đăng ký môn học của chính mình'
      });
    }

    const existing = await prisma.studentSubject.findUnique({
      where: {
        studentId_subjectId: {
          studentId,
          subjectId: subId
        }
      }
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy đăng ký môn học này'
      });
    }

    await prisma.studentSubject.delete({
      where: {
        studentId_subjectId: {
          studentId,
          subjectId: subId
        }
      }
    });

    res.json({
      status: 'success',
      message: 'Hủy đăng ký môn học thành công'
    });
  } catch (error) {
    console.error('StudentUnenrollSubject error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi hủy đăng ký môn học'
    });
  }
};

module.exports = {
  // Subject CRUD
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  toggleSubjectStatus,
  // Teacher subjects
  teacherRegisterSubject,
  getTeacherSubjects,
  teacherUnregisterSubject,
  // Student subjects
  studentEnrollSubject,
  getStudentSubjects,
  studentUnenrollSubject
};
