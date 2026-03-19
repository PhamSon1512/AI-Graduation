const prisma = require('../config/prisma');
const { BLOOM_LEVELS } = require('../services/ai.service');
const { normalizeQuestionType } = require('../constants/questionTypes');

// @desc    Get OCR session details
// @route   GET /api/exams/:examId/ocr-sessions/:sessionId
// @access  Teacher (owner)
const getOcrSession = async (req, res) => {
  try {
    const { examId, sessionId } = req.params;

    const session = await prisma.ocrSession.findFirst({
      where: {
        id: parseInt(sessionId),
        examId: parseInt(examId),
        teacherId: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy phiên OCR'
      });
    }

    res.json({
      status: 'success',
      data: {
        id: session.id,
        examId: session.examId,
        fileName: session.fileName,
        fileType: session.fileType,
        status: session.status,
        questions: session.rawQuestions,
        reviewedData: session.reviewedData,
        createdAt: session.createdAt
      }
    });
  } catch (error) {
    console.error('GetOcrSession error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server'
    });
  }
};

// @desc    Review OCR questions (approve/reject each question, edit answers)
// @route   PATCH /api/exams/:examId/ocr-sessions/:sessionId/review
// @access  Teacher (owner)
const reviewOcrQuestions = async (req, res) => {
  try {
    const { examId, sessionId } = req.params;
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng cung cấp danh sách câu hỏi cần duyệt'
      });
    }

    const session = await prisma.ocrSession.findFirst({
      where: {
        id: parseInt(sessionId),
        examId: parseInt(examId),
        teacherId: req.user.id,
        status: 'pending_review'
      }
    });

    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy phiên OCR hoặc phiên đã được xử lý'
      });
    }

    const rawQuestions = session.rawQuestions;
    const reviewedQuestions = [];

    for (const review of questions) {
      const { index, approved, correct_answer, bloom_level, topic, content_html, options } = review;

      if (index < 0 || index >= rawQuestions.length) continue;

      const originalQuestion = rawQuestions[index];

      if (approved === false) {
        reviewedQuestions.push({
          ...originalQuestion,
          _approved: false,
          _index: index
        });
        continue;
      }

      const updatedQuestion = {
        ...originalQuestion,
        _approved: true,
        _index: index
      };

      if (correct_answer !== undefined) {
        updatedQuestion.correct_answer = correct_answer;
      }

      if (bloom_level && BLOOM_LEVELS.includes(bloom_level)) {
        updatedQuestion.bloom_level = bloom_level;
      }

      if (topic) {
        updatedQuestion.topic = topic;
      }

      if (content_html) {
        updatedQuestion.content_html = content_html;
      }

      if (options) {
        updatedQuestion.options = options;
      }

      reviewedQuestions.push(updatedQuestion);
    }

    await prisma.ocrSession.update({
      where: { id: parseInt(sessionId) },
      data: {
        reviewedData: reviewedQuestions
      }
    });

    const approvedCount = reviewedQuestions.filter(q => q._approved).length;
    const rejectedCount = reviewedQuestions.filter(q => !q._approved).length;

    res.json({
      status: 'success',
      message: `Đã duyệt ${approvedCount} câu, loại bỏ ${rejectedCount} câu`,
      data: {
        approvedCount,
        rejectedCount,
        reviewedQuestions
      }
    });
  } catch (error) {
    console.error('ReviewOcr error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi duyệt câu hỏi'
    });
  }
};

// @desc    Approve all OCR questions at once
// @route   POST /api/exams/:examId/ocr-sessions/:sessionId/approve-all
// @access  Teacher (owner)
const approveAllOcrQuestions = async (req, res) => {
  try {
    const { examId, sessionId } = req.params;

    const session = await prisma.ocrSession.findFirst({
      where: {
        id: parseInt(sessionId),
        examId: parseInt(examId),
        teacherId: req.user.id,
        status: 'pending_review'
      }
    });

    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy phiên OCR hoặc phiên đã được xử lý'
      });
    }

    const rawQuestions = session.rawQuestions;
    const reviewedQuestions = rawQuestions.map((q, index) => ({
      ...q,
      _approved: true,
      _index: index
    }));

    await prisma.ocrSession.update({
      where: { id: parseInt(sessionId) },
      data: {
        reviewedData: reviewedQuestions
      }
    });

    res.json({
      status: 'success',
      message: `Đã duyệt tất cả ${reviewedQuestions.length} câu hỏi`,
      data: {
        approvedCount: reviewedQuestions.length,
        reviewedQuestions
      }
    });
  } catch (error) {
    console.error('ApproveAll error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server'
    });
  }
};

// @desc    Save reviewed OCR questions to database
// @route   POST /api/exams/:examId/ocr-sessions/:sessionId/save
// @access  Teacher (owner)
const saveOcrQuestions = async (req, res) => {
  try {
    const { examId, sessionId } = req.params;

    const session = await prisma.ocrSession.findFirst({
      where: {
        id: parseInt(sessionId),
        examId: parseInt(examId),
        teacherId: req.user.id,
        status: 'pending_review'
      }
    });

    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy phiên OCR hoặc phiên đã được xử lý'
      });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(examId) }
    });

    if (!exam || exam.status !== 'draft') {
      return res.status(400).json({
        status: 'error',
        message: 'Đề thi không ở trạng thái nháp'
      });
    }

    const reviewedQuestions = session.reviewedData || session.rawQuestions;
    const approvedQuestions = Array.isArray(reviewedQuestions)
      ? reviewedQuestions.filter(q => q._approved !== false)
      : [];

    if (approvedQuestions.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Không có câu hỏi nào được duyệt để lưu'
      });
    }

    const existingCount = await prisma.question.count({
      where: { examId: parseInt(examId) }
    });

    const createdQuestions = await prisma.$transaction(
      approvedQuestions.map((q, index) => prisma.question.create({
        data: {
          examId: parseInt(examId),
          subjectId: exam.subjectId,
          orderNumber: existingCount + index + 1,
          contentHtml: q.content_html,
          options: q.options || null,
          questionType: normalizeQuestionType(q.question_type),
          topic: q.topic || 'general',
          bloomLevel: BLOOM_LEVELS.includes(q.bloom_level) ? q.bloom_level : 'nhan_biet',
          correctAnswer: q.correct_answer || null,
          roundingRule: q.rounding_rule || null,
          explanationHtml: q.explanation_html || null,
          hasImage: q.has_image || false,
          imageUrl: q.page_image_url || null,
          imageDescription: q.image_description || null,
          isAiGenerated: true,
          status: 'draft',
          createdById: req.user.id
        }
      }))
    );

    await prisma.ocrSession.update({
      where: { id: parseInt(sessionId) },
      data: { status: 'saved' }
    });

    const newTotal = existingCount + createdQuestions.length;
    await prisma.exam.update({
      where: { id: parseInt(examId) },
      data: { totalQuestions: newTotal }
    });

    res.status(201).json({
      status: 'success',
      message: `Đã lưu ${createdQuestions.length} câu hỏi vào đề thi`,
      data: {
        savedCount: createdQuestions.length,
        questions: createdQuestions
      }
    });
  } catch (error) {
    console.error('SaveOcr error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi lưu câu hỏi'
    });
  }
};

// @desc    Cancel OCR session
// @route   DELETE /api/exams/:examId/ocr-sessions/:sessionId
// @access  Teacher (owner)
const cancelOcrSession = async (req, res) => {
  try {
    const { examId, sessionId } = req.params;

    const session = await prisma.ocrSession.findFirst({
      where: {
        id: parseInt(sessionId),
        examId: parseInt(examId),
        teacherId: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy phiên OCR'
      });
    }

    if (session.status === 'saved') {
      return res.status(400).json({
        status: 'error',
        message: 'Không thể hủy phiên OCR đã được lưu'
      });
    }

    await prisma.ocrSession.update({
      where: { id: parseInt(sessionId) },
      data: { status: 'cancelled' }
    });

    res.json({
      status: 'success',
      message: 'Đã hủy phiên OCR'
    });
  } catch (error) {
    console.error('CancelOcr error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server'
    });
  }
};

module.exports = {
  getOcrSession,
  reviewOcrQuestions,
  approveAllOcrQuestions,
  saveOcrQuestions,
  cancelOcrSession
};
