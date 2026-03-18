const prisma = require('../config/prisma');

// @desc    Student enrolls in a class by entering class name
// @route   POST /api/enrollments
// @access  Student
const enrollInClass = async (req, res) => {
  try {
    const { className } = req.body;
    const studentId = req.user.id;

    if (!className || !className.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng nhập tên lớp học'
      });
    }

    // Find class by name (case-insensitive)
    const classData = await prisma.class.findFirst({
      where: {
        name: { equals: className.trim(), mode: 'insensitive' },
        isActive: true,
        deletedAt: null
      },
      include: {
        teacher: { select: { id: true, fullName: true } },
        subject: { select: { id: true, name: true } }
      }
    });

    if (!classData) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy lớp học với tên này. Vui lòng kiểm tra lại.'
      });
    }

    // Check if student already enrolled (any status)
    const existingEnrollment = await prisma.classStudent.findUnique({
      where: {
        classId_studentId: {
          classId: classData.id,
          studentId
        }
      }
    });

    if (existingEnrollment) {
      const statusMsg = existingEnrollment.status === 'pending'
        ? 'Bạn đã đăng ký lớp này và đang chờ duyệt'
        : 'Bạn đã là thành viên của lớp này';
      return res.status(409).json({
        status: 'error',
        message: statusMsg
      });
    }

    // Create enrollment with pending status
    const enrollment = await prisma.classStudent.create({
      data: {
        classId: classData.id,
        studentId,
        status: 'pending'
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            code: true,
            schoolYear: true,
            teacher: { select: { id: true, fullName: true } },
            subject: { select: { id: true, name: true } }
          }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Đăng ký lớp học thành công. Vui lòng chờ giáo viên duyệt.',
      data: {
        id: enrollment.id,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        class: enrollment.class
      }
    });
  } catch (error) {
    console.error('EnrollInClass error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi đăng ký lớp học'
    });
  }
};

// @desc    Student views their enrollments
// @route   GET /api/enrollments/my
// @access  Student
const getMyEnrollments = async (req, res) => {
  try {
    const studentId = req.user.id;

    const enrollments = await prisma.classStudent.findMany({
      where: { studentId },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            code: true,
            schoolYear: true,
            isActive: true,
            teacher: { select: { id: true, fullName: true } },
            subject: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { enrolledAt: 'desc' }
    });

    res.json({
      status: 'success',
      data: {
        enrollments: enrollments.map(e => ({
          id: e.id,
          status: e.status,
          enrolledAt: e.enrolledAt,
          class: e.class
        })),
        total: enrollments.length
      }
    });
  } catch (error) {
    console.error('GetMyEnrollments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi lấy danh sách đăng ký'
    });
  }
};

// @desc    Teacher views pending enrollment requests for their classes
// @route   GET /api/enrollments/pending
// @access  Teacher/Admin
const getPendingEnrollments = async (req, res) => {
  try {
    const { classId, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 50);
    const skip = (pageNum - 1) * limitNum;

    // Build class filter: teacher sees only their own classes
    const classWhere = {
      isActive: true,
      deletedAt: null
    };

    if (req.user.role === 'teacher') {
      classWhere.teacherId = req.user.id;
    }

    if (classId) {
      classWhere.id = parseInt(classId);
    }

    // Find teacher's classes first
    const teacherClasses = await prisma.class.findMany({
      where: classWhere,
      select: { id: true }
    });

    const classIds = teacherClasses.map(c => c.id);

    if (classIds.length === 0) {
      return res.json({
        status: 'success',
        data: {
          enrollments: [],
          pagination: { currentPage: pageNum, totalPages: 0, totalCount: 0, limit: limitNum }
        }
      });
    }

    const where = {
      classId: { in: classIds },
      status: 'pending'
    };

    const [enrollments, totalCount] = await Promise.all([
      prisma.classStudent.findMany({
        where,
        include: {
          student: {
            select: { id: true, fullName: true, email: true, className: true }
          },
          class: {
            select: { id: true, name: true, code: true, schoolYear: true }
          }
        },
        orderBy: { enrolledAt: 'asc' },
        skip,
        take: limitNum
      }),
      prisma.classStudent.count({ where })
    ]);

    res.json({
      status: 'success',
      data: {
        enrollments: enrollments.map(e => ({
          id: e.id,
          status: e.status,
          enrolledAt: e.enrolledAt,
          student: e.student,
          class: e.class
        })),
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalCount,
          limit: limitNum
        }
      }
    });
  } catch (error) {
    console.error('GetPendingEnrollments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi lấy danh sách chờ duyệt'
    });
  }
};

// @desc    Teacher approves enrollment request(s)
// @route   PATCH /api/enrollments/:id/approve
// @access  Teacher/Admin
const approveEnrollment = async (req, res) => {
  try {
    const { id } = req.params;

    const enrollment = await prisma.classStudent.findUnique({
      where: { id: parseInt(id) },
      include: {
        class: { select: { id: true, name: true, teacherId: true } },
        student: { select: { id: true, fullName: true, email: true } }
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy yêu cầu đăng ký'
      });
    }

    // Check ownership: teacher can only approve their own classes
    if (req.user.role === 'teacher' && enrollment.class.teacherId !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền duyệt yêu cầu cho lớp này'
      });
    }

    if (enrollment.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: `Yêu cầu này đã ở trạng thái "${enrollment.status}", không thể duyệt`
      });
    }

    const updated = await prisma.classStudent.update({
      where: { id: parseInt(id) },
      data: { status: 'active' },
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        class: { select: { id: true, name: true, code: true } }
      }
    });

    res.json({
      status: 'success',
      message: `Đã duyệt học sinh "${updated.student.fullName}" vào lớp "${updated.class.name}"`,
      data: {
        id: updated.id,
        status: updated.status,
        student: updated.student,
        class: updated.class
      }
    });
  } catch (error) {
    console.error('ApproveEnrollment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi duyệt yêu cầu'
    });
  }
};

// @desc    Teacher rejects enrollment request
// @route   PATCH /api/enrollments/:id/reject
// @access  Teacher/Admin
const rejectEnrollment = async (req, res) => {
  try {
    const { id } = req.params;

    const enrollment = await prisma.classStudent.findUnique({
      where: { id: parseInt(id) },
      include: {
        class: { select: { id: true, name: true, teacherId: true } },
        student: { select: { id: true, fullName: true } }
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy yêu cầu đăng ký'
      });
    }

    if (req.user.role === 'teacher' && enrollment.class.teacherId !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền từ chối yêu cầu cho lớp này'
      });
    }

    if (enrollment.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: `Yêu cầu này đã ở trạng thái "${enrollment.status}", không thể từ chối`
      });
    }

    // Delete the record on rejection
    await prisma.classStudent.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      status: 'success',
      message: `Đã từ chối yêu cầu đăng ký của "${enrollment.student.fullName}" vào lớp "${enrollment.class.name}"`
    });
  } catch (error) {
    console.error('RejectEnrollment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi từ chối yêu cầu'
    });
  }
};

module.exports = {
  enrollInClass,
  getMyEnrollments,
  getPendingEnrollments,
  approveEnrollment,
  rejectEnrollment
};
