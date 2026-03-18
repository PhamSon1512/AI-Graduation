const prisma = require('../config/prisma');

// ==================== ADMIN: CLASS CRUD ====================

// @desc    Create new class with teacher assignment
// @route   POST /api/classes
// @access  Admin
const createClass = async (req, res) => {
  try {
    const { name, code, description, schoolYear, teacherId, subjectId } = req.body;

    if (!name || !code || !teacherId) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng cung cấp tên lớp, mã lớp và giáo viên phụ trách'
      });
    }

    const existingClass = await prisma.class.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (existingClass) {
      return res.status(409).json({
        status: 'error',
        message: 'Mã lớp đã tồn tại'
      });
    }

    const teacher = await prisma.user.findFirst({
      where: { id: parseInt(teacherId), role: 'teacher', isActive: true, deletedAt: null }
    });

    if (!teacher) {
      return res.status(404).json({
        status: 'error',
        message: 'Giáo viên không tồn tại hoặc không hoạt động'
      });
    }

    if (subjectId) {
      const subject = await prisma.subject.findUnique({
        where: { id: parseInt(subjectId) }
      });
      if (!subject || !subject.isActive) {
        return res.status(404).json({
          status: 'error',
          message: 'Môn học không tồn tại hoặc đã bị ẩn'
        });
      }
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        code: code.toUpperCase(),
        description: description || null,
        schoolYear: schoolYear || null,
        teacherId: parseInt(teacherId),
        subjectId: subjectId ? parseInt(subjectId) : null
      },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
        subject: { select: { id: true, code: true, name: true } }
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Tạo lớp học thành công',
      data: newClass
    });
  } catch (error) {
    console.error('CreateClass error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi tạo lớp học'
    });
  }
};

// @desc    Update class
// @route   PUT /api/classes/:id
// @access  Admin
const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, schoolYear, teacherId, subjectId } = req.body;

    const existingClass = await prisma.class.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingClass || existingClass.deletedAt) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy lớp học'
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (schoolYear !== undefined) updateData.schoolYear = schoolYear;

    if (teacherId) {
      const teacher = await prisma.user.findFirst({
        where: { id: parseInt(teacherId), role: 'teacher', isActive: true, deletedAt: null }
      });
      if (!teacher) {
        return res.status(404).json({
          status: 'error',
          message: 'Giáo viên không tồn tại'
        });
      }
      updateData.teacherId = parseInt(teacherId);
    }

    if (subjectId !== undefined) {
      if (subjectId === null) {
        updateData.subjectId = null;
      } else {
        const subject = await prisma.subject.findUnique({
          where: { id: parseInt(subjectId) }
        });
        if (!subject || !subject.isActive) {
          return res.status(404).json({
            status: 'error',
            message: 'Môn học không tồn tại'
          });
        }
        updateData.subjectId = parseInt(subjectId);
      }
    }

    const updatedClass = await prisma.class.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
        subject: { select: { id: true, code: true, name: true } },
        _count: { select: { students: true } }
      }
    });

    res.json({
      status: 'success',
      message: 'Cập nhật lớp học thành công',
      data: {
        ...updatedClass,
        studentCount: updatedClass._count.students,
        _count: undefined
      }
    });
  } catch (error) {
    console.error('UpdateClass error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi cập nhật lớp học'
    });
  }
};

// @desc    Soft delete class
// @route   DELETE /api/classes/:id
// @access  Admin
const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;

    const existingClass = await prisma.class.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingClass || existingClass.deletedAt) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy lớp học'
      });
    }

    await prisma.class.update({
      where: { id: parseInt(id) },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });

    res.json({
      status: 'success',
      message: 'Xóa lớp học thành công'
    });
  } catch (error) {
    console.error('DeleteClass error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi xóa lớp học'
    });
  }
};

// ==================== ADMIN/TEACHER: VIEW CLASSES ====================

// @desc    Get all classes
// @route   GET /api/classes
// @access  Admin / Teacher
const getClasses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      teacherId,
      subjectId,
      schoolYear,
      isActive
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 50);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      deletedAt: null
    };

    if (req.user.role === 'teacher') {
      where.teacherId = req.user.id;
    } else if (teacherId) {
      where.teacherId = parseInt(teacherId);
    }

    if (subjectId) {
      where.subjectId = parseInt(subjectId);
    }

    if (schoolYear) {
      where.schoolYear = schoolYear;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [classes, totalCount] = await Promise.all([
      prisma.class.findMany({
        where,
        include: {
          teacher: { select: { id: true, fullName: true, email: true } },
          subject: { select: { id: true, code: true, name: true } },
          _count: { select: { students: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.class.count({ where })
    ]);

    res.json({
      status: 'success',
      data: {
        classes: classes.map(c => ({
          ...c,
          studentCount: c._count.students,
          _count: undefined
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
    console.error('GetClasses error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi lấy danh sách lớp học'
    });
  }
};

const getPublicClasses = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, teacherId, subjectId, schoolYear } = req.query;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 50);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      isActive: true,
      deletedAt: null
    };

    if (teacherId) {
      where.teacherId = parseInt(teacherId);
    }

    if (subjectId) {
      where.subjectId = parseInt(subjectId);
    }

    if (schoolYear) {
      where.schoolYear = schoolYear;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [classes, totalCount] = await Promise.all([
      prisma.class.findMany({
        where,
        include: {
          teacher: { select: { id: true, fullName: true } },
          subject: { select: { id: true, code: true, name: true } },
          _count: { select: { students: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.class.count({ where })
    ]);

    res.json({
      status: 'success',
      data: {
        classes: classes.map(c => ({
          id: c.id,
          name: c.name,
          code: c.code,
          description: c.description,
          schoolYear: c.schoolYear,
          teacher: c.teacher,
          subject: c.subject,
          studentCount: c._count?.students ?? 0
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
    console.error('GetPublicClasses error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi lấy danh sách lớp public'
    });
  }
};

// @desc    Get class by ID with students
// @route   GET /api/classes/:id
// @access  Admin / Teacher (owner)
const getClassById = async (req, res) => {
  try {
    const { id } = req.params;

    const classData = await prisma.class.findFirst({
      where: {
        id: parseInt(id),
        deletedAt: null
      },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
        subject: { select: { id: true, code: true, name: true } },
        students: {
          include: {
            student: {
              select: { id: true, fullName: true, email: true, className: true }
            }
          },
          orderBy: { enrolledAt: 'desc' }
        }
      }
    });

    if (!classData) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy lớp học'
      });
    }

    if (req.user.role === 'teacher' && classData.teacherId !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền xem lớp học này'
      });
    }

    res.json({
      status: 'success',
      data: {
        ...classData,
        studentCount: classData.students.length,
        students: classData.students.map(s => ({
          id: s.id,
          enrolledAt: s.enrolledAt,
          status: s.status,
          ...s.student
        }))
      }
    });
  } catch (error) {
    console.error('GetClassById error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server'
    });
  }
};

// ==================== TEACHER: STUDENT MANAGEMENT ====================

// @desc    Add student to class (approve student)
// @route   POST /api/classes/:classId/students
// @access  Teacher (owner)
const addStudentToClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { studentId, studentIds } = req.body;

    const classData = await prisma.class.findFirst({
      where: { id: parseInt(classId), deletedAt: null }
    });

    if (!classData) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy lớp học'
      });
    }

    if (classData.teacherId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền thêm học sinh vào lớp này'
      });
    }

    const idsToAdd = studentIds || (studentId ? [studentId] : []);

    if (idsToAdd.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng cung cấp studentId hoặc studentIds'
      });
    }

    const students = await prisma.user.findMany({
      where: {
        id: { in: idsToAdd.map(id => parseInt(id)) },
        role: 'student',
        isActive: true,
        deletedAt: null
      }
    });

    if (students.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy học sinh hợp lệ'
      });
    }

    const existingEnrollments = await prisma.classStudent.findMany({
      where: {
        classId: parseInt(classId),
        studentId: { in: students.map(s => s.id) }
      }
    });

    const existingStudentIds = existingEnrollments.map(e => e.studentId);
    const newStudents = students.filter(s => !existingStudentIds.includes(s.id));

    if (newStudents.length === 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Tất cả học sinh đã có trong lớp'
      });
    }

    await prisma.classStudent.createMany({
      data: newStudents.map(s => ({
        classId: parseInt(classId),
        studentId: s.id,
        status: 'active'
      }))
    });

    res.status(201).json({
      status: 'success',
      message: `Đã thêm ${newStudents.length} học sinh vào lớp`,
      data: {
        addedCount: newStudents.length,
        skippedCount: existingStudentIds.length,
        addedStudents: newStudents.map(s => ({ id: s.id, fullName: s.fullName }))
      }
    });
  } catch (error) {
    console.error('AddStudent error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi thêm học sinh'
    });
  }
};

// @desc    Remove student from class
// @route   DELETE /api/classes/:classId/students/:studentId
// @access  Teacher (owner)
const removeStudentFromClass = async (req, res) => {
  try {
    const { classId, studentId } = req.params;

    const classData = await prisma.class.findFirst({
      where: { id: parseInt(classId), deletedAt: null }
    });

    if (!classData) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy lớp học'
      });
    }

    if (classData.teacherId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền xóa học sinh khỏi lớp này'
      });
    }

    const enrollment = await prisma.classStudent.findFirst({
      where: {
        classId: parseInt(classId),
        studentId: parseInt(studentId)
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        status: 'error',
        message: 'Học sinh không có trong lớp này'
      });
    }

    await prisma.classStudent.delete({
      where: { id: enrollment.id }
    });

    res.json({
      status: 'success',
      message: 'Đã xóa học sinh khỏi lớp'
    });
  } catch (error) {
    console.error('RemoveStudent error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server'
    });
  }
};

// @desc    Get class results (student exam results)
// @route   GET /api/classes/:classId/results
// @access  Teacher (owner)
const getClassResults = async (req, res) => {
  try {
    const { classId } = req.params;
    const { examId, sortBy = 'totalScore', sortOrder = 'desc' } = req.query;

    const classData = await prisma.class.findFirst({
      where: { id: parseInt(classId), deletedAt: null },
      include: {
        students: {
          include: {
            student: { select: { id: true, fullName: true, email: true } }
          }
        }
      }
    });

    if (!classData) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy lớp học'
      });
    }

    if (classData.teacherId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền xem kết quả lớp này'
      });
    }

    const studentIds = classData.students.map(s => s.studentId);

    const whereResults = {
      studentId: { in: studentIds }
    };

    if (examId) {
      whereResults.examId = parseInt(examId);
    }

    const results = await prisma.studentExamResult.findMany({
      where: whereResults,
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        exam: { select: { id: true, code: true, title: true } }
      },
      orderBy: { [sortBy]: sortOrder }
    });

    const studentResults = {};
    results.forEach(r => {
      if (!studentResults[r.studentId]) {
        studentResults[r.studentId] = {
          student: r.student,
          exams: [],
          averageScore: 0
        };
      }
      studentResults[r.studentId].exams.push({
        exam: r.exam,
        score: r.totalScore,
        submittedAt: r.submittedAt
      });
    });

    Object.values(studentResults).forEach(sr => {
      const scores = sr.exams.map(e => parseFloat(e.score) || 0);
      sr.averageScore = scores.length > 0
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
        : 0;
      sr.examCount = sr.exams.length;
    });

    res.json({
      status: 'success',
      data: {
        class: {
          id: classData.id,
          name: classData.name,
          code: classData.code,
          studentCount: classData.students.length
        },
        results: Object.values(studentResults),
        summary: {
          totalStudents: studentIds.length,
          studentsWithResults: Object.keys(studentResults).length,
          totalExamsTaken: results.length
        }
      }
    });
  } catch (error) {
    console.error('GetClassResults error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server'
    });
  }
};

module.exports = {
  createClass,
  updateClass,
  deleteClass,
  getClasses,
  getPublicClasses,
  getClassById,
  addStudentToClass,
  removeStudentFromClass,
  getClassResults
};
