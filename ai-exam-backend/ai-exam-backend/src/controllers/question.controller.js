const prisma = require('../config/prisma');
const { ocrExamImage, ocrMultipleFiles, generateExplanation, PHYSICS_12_TOPICS, BLOOM_LEVELS } = require('../services/ai.service');
const fs = require('fs');

// @desc    OCR - Trích xuất câu hỏi từ file đề thi (hỗ trợ nhiều file, nhiều định dạng)
// @route   POST /api/questions/ocr
// @access  Private (Teacher only)
const ocrExamImageHandler = async (req, res) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    
    if (files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng upload ít nhất 1 file đề thi (JPG, PNG, PDF, DOC, DOCX)'
      });
    }

    let result;
    
    if (files.length === 1) {
      result = await ocrExamImage(files[0].buffer, files[0].mimetype);
      result.metadata = {
        ...result.metadata,
        files_processed: 1,
        total_questions: result.questions?.length || 0
      };
    } else {
      result = await ocrMultipleFiles(files);
    }

    res.json({
      status: 'success',
      message: `Trích xuất thành công ${result.questions?.length || 0} câu hỏi từ ${files.length} file`,
      data: result
    });
  } catch (error) {
    console.error('OCR Handler Error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Lỗi khi xử lý OCR'
    });
  }
};

// @desc    Lưu câu hỏi từ kết quả OCR vào database
// @route   POST /api/questions/ocr/save
// @access  Private (Teacher only)
const saveOcrQuestions = async (req, res) => {
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Danh sách câu hỏi không hợp lệ'
      });
    }

    const createdQuestions = await prisma.$transaction(
      questions.map(q => prisma.question.create({
        data: {
          contentHtml: q.content_html,
          options: q.options || null,
          topic: q.topic || 'dao_dong_co',
          subject: 'vat_ly_12',
          bloomLevel: BLOOM_LEVELS.includes(q.bloom_level) ? q.bloom_level : 'nhan_biet',
          correctAnswer: ['A', 'B', 'C', 'D'].includes(q.correct_answer) ? q.correct_answer : null,
          explanationHtml: q.explanation_html || null,
          isAiGenerated: true,
          createdById: req.user.id
        }
      }))
    );

    res.status(201).json({
      status: 'success',
      message: `Đã lưu ${createdQuestions.length} câu hỏi vào ngân hàng`,
      data: {
        count: createdQuestions.length,
        questions: createdQuestions
      }
    });
  } catch (error) {
    console.error('Save OCR Questions Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi khi lưu câu hỏi'
    });
  }
};

// @desc    Tạo câu hỏi thủ công
// @route   POST /api/questions/manual
// @access  Private (Teacher only)
const createManualQuestion = async (req, res) => {
  try {
    const { content_html, options, topic, bloom_level, correct_answer, explanation_html } = req.body;

    if (!content_html) {
      return res.status(400).json({
        status: 'error',
        message: 'Nội dung câu hỏi không được để trống'
      });
    }

    if (!topic || !PHYSICS_12_TOPICS.includes(topic)) {
      return res.status(400).json({
        status: 'error',
        message: `Topic phải là một trong: ${PHYSICS_12_TOPICS.join(', ')}`
      });
    }

    if (!bloom_level || !BLOOM_LEVELS.includes(bloom_level)) {
      return res.status(400).json({
        status: 'error',
        message: `Bloom level phải là một trong: ${BLOOM_LEVELS.join(', ')}`
      });
    }

    if (correct_answer && !['A', 'B', 'C', 'D'].includes(correct_answer)) {
      return res.status(400).json({
        status: 'error',
        message: 'Đáp án đúng phải là A, B, C hoặc D'
      });
    }

    const question = await prisma.question.create({
      data: {
        contentHtml: content_html,
        options: options || null,
        topic,
        subject: 'vat_ly_12',
        bloomLevel: bloom_level,
        correctAnswer: correct_answer || null,
        explanationHtml: explanation_html || null,
        isAiGenerated: false,
        createdById: req.user.id
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Tạo câu hỏi thành công',
      data: question
    });
  } catch (error) {
    console.error('Create Question Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi khi tạo câu hỏi'
    });
  }
};

// @desc    Lấy danh sách câu hỏi (có filter)
// @route   GET /api/questions
// @access  Private
const getQuestions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      topic,
      bloom_level,
      subjectId,
      is_ai_generated,
      search
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = Math.min(parseInt(limit), 50);

    const where = {};

    if (subjectId) {
      where.subjectId = parseInt(subjectId);
    }

    if (topic) {
      where.topic = topic;
    }

    if (bloom_level && BLOOM_LEVELS.includes(bloom_level)) {
      where.bloomLevel = bloom_level;
    }

    if (is_ai_generated !== undefined) {
      where.isAiGenerated = is_ai_generated === 'true';
    }

    if (search) {
      where.contentHtml = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          subject: {
            select: { id: true, name: true, code: true }
          },
          exam: {
            select: { id: true, code: true, title: true }
          },
          createdBy: {
            select: { id: true, fullName: true }
          }
        }
      }),
      prisma.question.count({ where })
    ]);

    res.json({
      status: 'success',
      data: {
        questions,
        pagination: {
          page: parseInt(page),
          limit: take,
          total,
          totalPages: Math.ceil(total / take)
        }
      }
    });
  } catch (error) {
    console.error('Get Questions Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi khi lấy danh sách câu hỏi'
    });
  }
};

// @desc    Lấy chi tiết 1 câu hỏi
// @route   GET /api/questions/:id
// @access  Private
const getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await prisma.question.findUnique({
      where: { id: parseInt(id) },
      include: {
        createdBy: {
          select: { id: true, fullName: true }
        }
      }
    });

    if (!question) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy câu hỏi'
      });
    }

    res.json({
      status: 'success',
      data: question
    });
  } catch (error) {
    console.error('Get Question By ID Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi khi lấy câu hỏi'
    });
  }
};

// @desc    Cập nhật câu hỏi
// @route   PUT /api/questions/:id
// @access  Private (Teacher only)
const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { content_html, options, topic, bloom_level, correct_answer, explanation_html } = req.body;

    const existingQuestion = await prisma.question.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingQuestion) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy câu hỏi'
      });
    }

    const updateData = {};

    if (content_html !== undefined) {
      updateData.contentHtml = content_html;
    }

    if (options !== undefined) {
      updateData.options = options;
    }

    if (topic !== undefined) {
      if (!PHYSICS_12_TOPICS.includes(topic)) {
        return res.status(400).json({
          status: 'error',
          message: `Topic phải là một trong: ${PHYSICS_12_TOPICS.join(', ')}`
        });
      }
      updateData.topic = topic;
    }

    if (bloom_level !== undefined) {
      if (!BLOOM_LEVELS.includes(bloom_level)) {
        return res.status(400).json({
          status: 'error',
          message: `Bloom level phải là một trong: ${BLOOM_LEVELS.join(', ')}`
        });
      }
      updateData.bloomLevel = bloom_level;
    }

    if (correct_answer !== undefined) {
      if (correct_answer && !['A', 'B', 'C', 'D'].includes(correct_answer)) {
        return res.status(400).json({
          status: 'error',
          message: 'Đáp án đúng phải là A, B, C hoặc D'
        });
      }
      updateData.correctAnswer = correct_answer;
    }

    if (explanation_html !== undefined) {
      updateData.explanationHtml = explanation_html;
    }

    const question = await prisma.question.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, fullName: true }
        }
      }
    });

    res.json({
      status: 'success',
      message: 'Cập nhật câu hỏi thành công',
      data: question
    });
  } catch (error) {
    console.error('Update Question Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi khi cập nhật câu hỏi'
    });
  }
};

// @desc    Xóa câu hỏi
// @route   DELETE /api/questions/:id
// @access  Private (Teacher only)
const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const existingQuestion = await prisma.question.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingQuestion) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy câu hỏi'
      });
    }

    await prisma.question.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      status: 'success',
      message: 'Xóa câu hỏi thành công'
    });
  } catch (error) {
    console.error('Delete Question Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi khi xóa câu hỏi'
    });
  }
};

// @desc    AI tạo lời giải cho câu hỏi
// @route   POST /api/questions/:id/generate-explanation
// @access  Private (Teacher only)
const generateQuestionExplanation = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await prisma.question.findUnique({
      where: { id: parseInt(id) }
    });

    if (!question) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy câu hỏi'
      });
    }

    if (!question.correctAnswer) {
      return res.status(400).json({
        status: 'error',
        message: 'Câu hỏi chưa có đáp án đúng, không thể tạo lời giải'
      });
    }

    const explanation = await generateExplanation(
      { content_html: question.contentHtml, options: question.options },
      question.correctAnswer
    );

    const updatedQuestion = await prisma.question.update({
      where: { id: parseInt(id) },
      data: { explanationHtml: explanation }
    });

    res.json({
      status: 'success',
      message: 'Tạo lời giải thành công',
      data: {
        explanation_html: explanation,
        question: updatedQuestion
      }
    });
  } catch (error) {
    console.error('Generate Explanation Error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Lỗi khi tạo lời giải'
    });
  }
};

// @desc    Lấy thống kê câu hỏi
// @route   GET /api/questions/stats
// @access  Private
const getQuestionStats = async (req, res) => {
  try {
    const [byTopic, byBloomLevel, total, aiGenerated] = await Promise.all([
      prisma.question.groupBy({
        by: ['topic'],
        _count: { id: true }
      }),
      prisma.question.groupBy({
        by: ['bloomLevel'],
        _count: { id: true }
      }),
      prisma.question.count(),
      prisma.question.count({ where: { isAiGenerated: true } })
    ]);

    res.json({
      status: 'success',
      data: {
        total,
        aiGenerated,
        manualCreated: total - aiGenerated,
        byTopic: byTopic.reduce((acc, item) => {
          acc[item.topic] = item._count.id;
          return acc;
        }, {}),
        byBloomLevel: byBloomLevel.reduce((acc, item) => {
          acc[item.bloomLevel] = item._count.id;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Get Stats Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi khi lấy thống kê'
    });
  }
};

module.exports = {
  ocrExamImageHandler,
  saveOcrQuestions,
  createManualQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  generateQuestionExplanation,
  getQuestionStats
};
