const prisma = require('../config/prisma');

// @desc    Get pending exams for approval
// @route   GET /api/admin/exams/pending
// @access  Admin
const getPendingExams = async (req, res) => {
  try {
    const { page = 1, limit = 10, subjectId } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 50);
    const skip = (pageNum - 1) * limitNum;

    const where = { status: 'pending' };
    if (subjectId) {
      where.subjectId = parseInt(subjectId);
    }

    const [exams, totalCount] = await Promise.all([
      prisma.exam.findMany({
        where,
        include: {
          subject: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, fullName: true, email: true } },
          _count: { select: { questions: true } }
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limitNum
      }),
      prisma.exam.count({ where })
    ]);

    res.json({
      status: 'success',
      data: {
        exams: exams.map(e => ({
          ...e,
          questionCount: e._count.questions,
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
    console.error('GetPendingExams error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server'
    });
  }
};

// @desc    Get exam details for review
// @route   GET /api/admin/exams/:id/review
// @access  Admin
const getExamForReview = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(id) },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
        questions: {
          orderBy: { orderNumber: 'asc' },
          select: {
            id: true,
            orderNumber: true,
            contentHtml: true,
            options: true,
            questionType: true,
            topic: true,
            bloomLevel: true,
            correctAnswer: true,
            explanationHtml: true,
            hasImage: true,
            imageUrl: true,
            imageDescription: true,
            isAiGenerated: true
          }
        }
      }
    });

    if (!exam) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy đề thi'
      });
    }

    const stats = {
      totalQuestions: exam.questions.length,
      byBloomLevel: {},
      byQuestionType: {},
      byTopic: {},
      aiGenerated: exam.questions.filter(q => q.isAiGenerated).length
    };

    exam.questions.forEach(q => {
      stats.byBloomLevel[q.bloomLevel] = (stats.byBloomLevel[q.bloomLevel] || 0) + 1;
      stats.byQuestionType[q.questionType] = (stats.byQuestionType[q.questionType] || 0) + 1;
      stats.byTopic[q.topic] = (stats.byTopic[q.topic] || 0) + 1;
    });

    res.json({
      status: 'success',
      data: {
        exam,
        stats
      }
    });
  } catch (error) {
    console.error('GetExamForReview error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server'
    });
  }
};

// @desc    Approve exam
// @route   PATCH /api/admin/exams/:id/approve
// @access  Admin
const approveExam = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(id) }
    });

    if (!exam) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy đề thi'
      });
    }

    if (exam.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Chỉ có thể duyệt đề thi đang chờ duyệt'
      });
    }

    const [updatedExam] = await prisma.$transaction([
      prisma.exam.update({
        where: { id: parseInt(id) },
        data: {
          status: 'approved',
          approvedById: req.user.id,
          approvedAt: new Date()
        },
        include: {
          subject: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, fullName: true } }
        }
      }),
      prisma.question.updateMany({
        where: { examId: parseInt(id) },
        data: { status: 'approved' }
      })
    ]);

    res.json({
      status: 'success',
      message: 'Duyệt đề thi thành công',
      data: updatedExam
    });
  } catch (error) {
    console.error('ApproveExam error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi duyệt đề thi'
    });
  }
};

// @desc    Reject exam
// @route   PATCH /api/admin/exams/:id/reject
// @access  Admin
const rejectExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng cung cấp lý do từ chối'
      });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(id) }
    });

    if (!exam) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy đề thi'
      });
    }

    if (exam.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Chỉ có thể từ chối đề thi đang chờ duyệt'
      });
    }

    const updatedExam = await prisma.exam.update({
      where: { id: parseInt(id) },
      data: {
        status: 'rejected',
        rejectionReason: reason,
        approvedById: req.user.id,
        approvedAt: new Date()
      },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, fullName: true } }
      }
    });

    res.json({
      status: 'success',
      message: 'Đã từ chối đề thi',
      data: updatedExam
    });
  } catch (error) {
    console.error('RejectExam error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi từ chối đề thi'
    });
  }
};

// @desc    Get all exams (admin view)
// @route   GET /api/admin/exams
// @access  Admin
const getAllExamsAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      subjectId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 50);
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (subjectId) {
      where.subjectId = parseInt(subjectId);
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [exams, totalCount] = await Promise.all([
      prisma.exam.findMany({
        where,
        include: {
          subject: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, fullName: true } },
          approvedBy: { select: { id: true, fullName: true } },
          _count: { select: { questions: true } }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limitNum
      }),
      prisma.exam.count({ where })
    ]);

    res.json({
      status: 'success',
      data: {
        exams: exams.map(e => ({
          ...e,
          questionCount: e._count.questions,
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
    console.error('GetAllExamsAdmin error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server'
    });
  }
};

module.exports = {
  getPendingExams,
  getExamForReview,
  approveExam,
  rejectExam,
  getAllExamsAdmin
};
