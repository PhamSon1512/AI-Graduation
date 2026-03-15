const prisma = require('../config/prisma');
const { ocrExamImage, ocrMultipleFiles, PHYSICS_12_TOPICS, BLOOM_LEVELS } = require('../services/ai.service');
const { parseExcelFile, generateTemplateExcel, getTemplateInfo, QUESTION_TYPES } = require('../services/excel.service');
const { uploadImage, isCloudinaryConfigured } = require('../config/cloudinary.config');

// ==================== EXAM CRUD ====================

// @desc    Create new exam (draft)
// @route   POST /api/exams
// @access  Teacher
const createExam = async (req, res) => {
  try {
    const { code, title, description, subjectId, durationMinutes = 45 } = req.body;

    if (!code || !title || !subjectId) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng cung cấp mã đề (code), tên đề (title) và môn học (subjectId)'
      });
    }

    const existingExam = await prisma.exam.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (existingExam) {
      return res.status(409).json({
        status: 'error',
        message: 'Mã đề đã tồn tại'
      });
    }

    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(subjectId) }
    });

    if (!subject || !subject.isActive) {
      return res.status(404).json({
        status: 'error',
        message: 'Môn học không tồn tại hoặc đã bị ẩn'
      });
    }

    const exam = await prisma.exam.create({
      data: {
        code: code.toUpperCase(),
        title,
        description: description || null,
        subjectId: parseInt(subjectId),
        durationMinutes: parseInt(durationMinutes),
        status: 'draft',
        createdById: req.user.id
      },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, fullName: true } }
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Tạo đề thi thành công',
      data: exam
    });
  } catch (error) {
    console.error('CreateExam error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi tạo đề thi'
    });
  }
};

// @desc    Get exams list (teacher's own or all for admin)
// @route   GET /api/exams
// @access  Teacher/Admin
const getExams = async (req, res) => {
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

    if (req.user.role === 'teacher') {
      where.createdById = req.user.id;
    }

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
    console.error('GetExams error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi lấy danh sách đề thi'
    });
  }
};

// @desc    Get exam by ID with questions
// @route   GET /api/exams/:id
// @access  Teacher/Admin
const getExamById = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(id) },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
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
            status: true
          }
        },
        ocrSessions: {
          where: { status: 'pending_review' },
          select: { id: true, fileName: true, status: true, createdAt: true }
        }
      }
    });

    if (!exam) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy đề thi'
      });
    }

    if (req.user.role === 'teacher' && exam.createdById !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền xem đề thi này'
      });
    }

    res.json({
      status: 'success',
      data: {
        ...exam,
        totalQuestions: exam.questions.length,
        questionCount: exam.questions.length
      }
    });
  } catch (error) {
    console.error('GetExamById error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi lấy thông tin đề thi'
    });
  }
};

// @desc    Update exam info
// @route   PUT /api/exams/:id
// @access  Teacher (owner)
const updateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, durationMinutes } = req.body;

    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(id) }
    });

    if (!exam) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy đề thi'
      });
    }

    if (exam.createdById !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền chỉnh sửa đề thi này'
      });
    }

    if (exam.status === 'approved') {
      return res.status(400).json({
        status: 'error',
        message: 'Không thể chỉnh sửa đề thi đã được duyệt'
      });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (durationMinutes) updateData.durationMinutes = parseInt(durationMinutes);

    const updatedExam = await prisma.exam.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        subject: { select: { id: true, code: true, name: true } }
      }
    });

    res.json({
      status: 'success',
      message: 'Cập nhật đề thi thành công',
      data: updatedExam
    });
  } catch (error) {
    console.error('UpdateExam error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi cập nhật đề thi'
    });
  }
};

// @desc    Submit exam for approval
// @route   POST /api/exams/:id/submit
// @access  Teacher (owner)
const submitExamForApproval = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(id) },
      include: { _count: { select: { questions: true } } }
    });

    if (!exam) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy đề thi'
      });
    }

    if (exam.createdById !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền gửi duyệt đề thi này'
      });
    }

    if (exam.status !== 'draft') {
      return res.status(400).json({
        status: 'error',
        message: 'Chỉ có thể gửi duyệt đề thi ở trạng thái nháp'
      });
    }

    if (exam._count.questions === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Đề thi phải có ít nhất 1 câu hỏi'
      });
    }

    const updatedExam = await prisma.exam.update({
      where: { id: parseInt(id) },
      data: {
        status: 'pending',
        totalQuestions: exam._count.questions
      }
    });

    res.json({
      status: 'success',
      message: 'Đã gửi đề thi chờ duyệt',
      data: updatedExam
    });
  } catch (error) {
    console.error('SubmitExam error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi gửi duyệt đề thi'
    });
  }
};

// @desc    Delete exam (only draft)
// @route   DELETE /api/exams/:id
// @access  Teacher (owner) / Admin
const deleteExam = async (req, res) => {
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

    if (req.user.role === 'teacher' && exam.createdById !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền xóa đề thi này'
      });
    }

    if (exam.status === 'approved' && req.user.role !== 'admin') {
      return res.status(400).json({
        status: 'error',
        message: 'Không thể xóa đề thi đã được duyệt'
      });
    }

    await prisma.exam.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      status: 'success',
      message: 'Xóa đề thi thành công'
    });
  } catch (error) {
    console.error('DeleteExam error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi xóa đề thi'
    });
  }
};

// ==================== QUESTION MANAGEMENT (trong đề) ====================

// @desc    Add question to exam manually
// @route   POST /api/exams/:examId/questions
// @access  Teacher (owner)
const addQuestionToExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const { content_html, options, question_type, topic, bloom_level, correct_answer, explanation_html } = req.body;

    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(examId) }
    });

    if (!exam) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy đề thi'
      });
    }

    if (exam.createdById !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền thêm câu hỏi vào đề thi này'
      });
    }

    if (exam.status !== 'draft') {
      return res.status(400).json({
        status: 'error',
        message: 'Chỉ có thể thêm câu hỏi vào đề thi nháp'
      });
    }

    if (!content_html) {
      return res.status(400).json({
        status: 'error',
        message: 'Nội dung câu hỏi không được để trống'
      });
    }

    const questionCount = await prisma.question.count({
      where: { examId: parseInt(examId) }
    });

    const question = await prisma.question.create({
      data: {
        examId: parseInt(examId),
        subjectId: exam.subjectId,
        orderNumber: questionCount + 1,
        contentHtml: content_html,
        options: options || null,
        questionType: QUESTION_TYPES.includes(question_type) ? question_type : 'trac_nghiem',
        topic: topic || 'general',
        bloomLevel: BLOOM_LEVELS.includes(bloom_level) ? bloom_level : 'nhan_biet',
        correctAnswer: correct_answer || null,
        explanationHtml: explanation_html || null,
        isAiGenerated: false,
        status: 'draft',
        createdById: req.user.id
      }
    });

    await prisma.exam.update({
      where: { id: parseInt(examId) },
      data: { totalQuestions: questionCount + 1 }
    });

    res.status(201).json({
      status: 'success',
      message: 'Thêm câu hỏi thành công',
      data: question
    });
  } catch (error) {
    console.error('AddQuestion error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi thêm câu hỏi'
    });
  }
};

// @desc    Import questions from Excel
// @route   POST /api/exams/:examId/questions/import
// @access  Teacher (owner)
const importQuestionsFromExcel = async (req, res) => {
  try {
    const { examId } = req.params;
    const { templateId = 'template_1' } = req.body;

    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng upload file Excel'
      });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(examId) }
    });

    if (!exam) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy đề thi'
      });
    }

    if (exam.createdById !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền import câu hỏi vào đề thi này'
      });
    }

    if (exam.status !== 'draft') {
      return res.status(400).json({
        status: 'error',
        message: 'Chỉ có thể import câu hỏi vào đề thi nháp'
      });
    }

    const parseResult = parseExcelFile(req.file.buffer, templateId);

    if (!parseResult.success) {
      return res.status(400).json({
        status: 'error',
        message: parseResult.error
      });
    }

    if (parseResult.questions.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Không tìm thấy câu hỏi hợp lệ trong file Excel'
      });
    }

    const existingCount = await prisma.question.count({
      where: { examId: parseInt(examId) }
    });

    const createdQuestions = await prisma.$transaction(
      parseResult.questions.map((q, index) => prisma.question.create({
        data: {
          examId: parseInt(examId),
          subjectId: exam.subjectId,
          orderNumber: existingCount + index + 1,
          contentHtml: q.content_html,
          options: q.options,
          questionType: q.question_type,
          topic: q.topic || 'general',
          bloomLevel: q.bloom_level,
          correctAnswer: q.correct_answer,
          explanationHtml: q.explanation_html,
          isAiGenerated: false,
          status: 'draft',
          createdById: req.user.id
        }
      }))
    );

    const newTotal = existingCount + createdQuestions.length;
    await prisma.exam.update({
      where: { id: parseInt(examId) },
      data: { totalQuestions: newTotal }
    });

    res.status(201).json({
      status: 'success',
      message: `Import thành công ${createdQuestions.length} câu hỏi`,
      data: {
        imported: createdQuestions.length,
        errors: parseResult.errors,
        templateUsed: parseResult.templateUsed
      }
    });
  } catch (error) {
    console.error('ImportExcel error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi import câu hỏi'
    });
  }
};

// @desc    OCR questions from image/pdf
// @route   POST /api/exams/:examId/questions/ocr
// @access  Teacher (owner)
const ocrQuestionsForExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const files = req.files || (req.file ? [req.file] : []);

    if (files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng upload file (JPG, PNG, PDF)'
      });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(examId) }
    });

    if (!exam) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy đề thi'
      });
    }

    if (exam.createdById !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền thêm câu hỏi vào đề thi này'
      });
    }

    if (exam.status !== 'draft') {
      return res.status(400).json({
        status: 'error',
        message: 'Chỉ có thể thêm câu hỏi vào đề thi nháp'
      });
    }

    let ocrResult;
    if (files.length === 1) {
      ocrResult = await ocrExamImage(files[0].buffer, files[0].mimetype);
    } else {
      ocrResult = await ocrMultipleFiles(files);
    }

    if (!ocrResult.questions || ocrResult.questions.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Không trích xuất được câu hỏi từ file'
      });
    }

    const ocrSession = await prisma.ocrSession.create({
      data: {
        examId: parseInt(examId),
        teacherId: req.user.id,
        fileName: files.map(f => f.originalname).join(', '),
        fileType: files[0].mimetype,
        rawQuestions: ocrResult.questions,
        status: 'pending_review'
      }
    });

    res.json({
      status: 'success',
      message: `Trích xuất được ${ocrResult.questions.length} câu hỏi. Vui lòng duyệt trước khi lưu.`,
      data: {
        sessionId: ocrSession.id,
        questions: ocrResult.questions,
        metadata: ocrResult.metadata
      }
    });
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Lỗi server khi OCR'
    });
  }
};

// @desc    Get Excel template info
// @route   GET /api/exams/excel-templates
// @access  Teacher
const getExcelTemplates = async (req, res) => {
  try {
    const templates = getTemplateInfo();
    res.json({
      status: 'success',
      data: templates
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server'
    });
  }
};

// @desc    Download Excel template
// @route   GET /api/exams/excel-templates/:templateId/download
// @access  Teacher
const downloadExcelTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const buffer = generateTemplateExcel(templateId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${templateId}.xlsx`);
    res.send(buffer);
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

module.exports = {
  createExam,
  getExams,
  getExamById,
  updateExam,
  submitExamForApproval,
  deleteExam,
  addQuestionToExam,
  importQuestionsFromExcel,
  ocrQuestionsForExam,
  getExcelTemplates,
  downloadExcelTemplate
};
