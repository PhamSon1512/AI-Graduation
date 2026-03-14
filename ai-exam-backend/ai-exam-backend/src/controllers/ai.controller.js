const prisma = require('../config/prisma');
const {
  explainQuestion,
  getStepSolution,
  generateQuestions,
  generateExam
} = require('../services/ai.generator.service');

// ==================== AI TUTOR (Student) ====================

// @desc    AI giải thích câu hỏi
// @route   POST /api/ai/explain
// @access  Student
const explainQuestionHandler = async (req, res) => {
  try {
    const { questionId, question } = req.body;

    let questionData = question;

    if (questionId && !question) {
      questionData = await prisma.question.findUnique({
        where: { id: parseInt(questionId) },
        select: {
          id: true,
          contentHtml: true,
          options: true,
          correctAnswer: true,
          topic: true,
          bloomLevel: true
        }
      });

      if (!questionData) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy câu hỏi'
        });
      }
    }

    if (!questionData || !questionData.contentHtml && !questionData.content_html) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng cung cấp questionId hoặc question object'
      });
    }

    console.log('🤖 AI explaining question...');
    const explanation = await explainQuestion(questionData);

    res.json({
      status: 'success',
      message: 'Giải thích câu hỏi thành công',
      data: {
        question: questionData,
        explanation
      }
    });
  } catch (error) {
    console.error('ExplainQuestion error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Lỗi server khi giải thích câu hỏi'
    });
  }
};

// @desc    AI giải chi tiết từng bước
// @route   POST /api/ai/step-solution
// @access  Student
const stepSolutionHandler = async (req, res) => {
  try {
    const { questionId, question } = req.body;

    let questionData = question;

    if (questionId && !question) {
      questionData = await prisma.question.findUnique({
        where: { id: parseInt(questionId) },
        select: {
          id: true,
          contentHtml: true,
          options: true,
          correctAnswer: true,
          topic: true,
          bloomLevel: true
        }
      });

      if (!questionData) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy câu hỏi'
        });
      }
    }

    if (!questionData || !questionData.contentHtml && !questionData.content_html) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng cung cấp questionId hoặc question object'
      });
    }

    console.log('🤖 AI generating step-by-step solution...');
    const solution = await getStepSolution(questionData);

    res.json({
      status: 'success',
      message: 'Giải chi tiết thành công',
      data: {
        question: questionData,
        stepSolution: solution
      }
    });
  } catch (error) {
    console.error('StepSolution error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Lỗi server'
    });
  }
};

// ==================== AI QUESTION GENERATOR (Teacher) ====================

// @desc    AI sinh câu hỏi
// @route   POST /api/ai/generate-question
// @access  Teacher
const generateQuestionHandler = async (req, res) => {
  try {
    const { subjectId, topic, bloomLevel, questionType = 'trac_nghiem', count = 5 } = req.body;

    if (!subjectId || !topic || !bloomLevel) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng cung cấp subjectId, topic và bloomLevel'
      });
    }

    const validBloomLevels = ['nhan_biet', 'thong_hieu', 'van_dung', 'van_dung_cao'];
    if (!validBloomLevels.includes(bloomLevel)) {
      return res.status(400).json({
        status: 'error',
        message: `bloomLevel phải là một trong: ${validBloomLevels.join(', ')}`
      });
    }

    if (count < 1 || count > 20) {
      return res.status(400).json({
        status: 'error',
        message: 'Số lượng câu hỏi phải từ 1 đến 20'
      });
    }

    console.log(`🤖 AI generating ${count} questions...`);
    console.log(`   Subject: ${subjectId}, Topic: ${topic}, Bloom: ${bloomLevel}`);

    const result = await generateQuestions({
      subjectId,
      topic,
      bloomLevel,
      questionType,
      count: Math.min(parseInt(count), 20)
    });

    res.json({
      status: 'success',
      message: `Đã sinh ${result.questions.length} câu hỏi`,
      data: result
    });
  } catch (error) {
    console.error('GenerateQuestion error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Lỗi server khi sinh câu hỏi'
    });
  }
};

// @desc    AI sinh đề thi hoàn chỉnh
// @route   POST /api/ai/generate-exam
// @access  Teacher
const generateExamHandler = async (req, res) => {
  try {
    const { request, subjectId } = req.body;

    if (!request) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng cung cấp yêu cầu đề thi (request)'
      });
    }

    console.log('🤖 AI generating exam...');
    console.log(`   Request: "${request}"`);

    const result = await generateExam(request, req.user.id);

    res.json({
      status: 'success',
      message: `Đã tạo đề thi với ${result.questions.length} câu hỏi`,
      data: {
        exam: result.exam,
        questions: result.questions,
        summary: result.summary,
        aiAnalysis: result.structure
      }
    });
  } catch (error) {
    console.error('GenerateExam error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Lỗi server khi sinh đề thi'
    });
  }
};

// @desc    Lưu đề thi AI đã sinh vào database
// @route   POST /api/ai/save-generated-exam
// @access  Teacher
const saveGeneratedExam = async (req, res) => {
  try {
    const { exam, questions } = req.body;

    if (!exam || !questions || questions.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng cung cấp thông tin đề thi và danh sách câu hỏi'
      });
    }

    const examCode = `AI-${Date.now().toString(36).toUpperCase()}`;

    const createdExam = await prisma.exam.create({
      data: {
        code: examCode,
        title: exam.title || 'Đề thi AI',
        description: exam.description || `Đề thi được tạo bởi AI. ${exam.ai_reasoning || ''}`,
        subjectId: parseInt(exam.subject_id),
        totalQuestions: questions.length,
        durationMinutes: parseInt(exam.duration_minutes) || 60,
        isAiGenerated: true,
        status: 'draft',
        createdById: req.user.id
      }
    });

    const createdQuestions = await prisma.$transaction(
      questions.map((q, index) => prisma.question.create({
        data: {
          examId: createdExam.id,
          subjectId: parseInt(exam.subject_id),
          orderNumber: index + 1,
          contentHtml: q.content_html || q.contentHtml,
          options: q.options,
          questionType: 'trac_nghiem',
          topic: q.topic || 'general',
          bloomLevel: q.bloom_level || q.bloomLevel || 'nhan_biet',
          correctAnswer: q.correct_answer || q.correctAnswer,
          explanationHtml: q.explanation_html || q.explanationHtml,
          isAiGenerated: q.source === 'ai_generated' || q.is_ai_generated || false,
          status: 'draft',
          createdById: req.user.id
        }
      }))
    );

    res.status(201).json({
      status: 'success',
      message: `Đã lưu đề thi với ${createdQuestions.length} câu hỏi`,
      data: {
        exam: createdExam,
        questionCount: createdQuestions.length
      }
    });
  } catch (error) {
    console.error('SaveGeneratedExam error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Lỗi server khi lưu đề thi'
    });
  }
};

// @desc    Lấy thông tin để sinh câu hỏi (subjects, topics, bloom levels)
// @route   GET /api/ai/generation-options
// @access  Teacher
const getGenerationOptions = async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, topics: true }
    });

    const questionStats = await prisma.question.groupBy({
      by: ['subjectId', 'topic', 'bloomLevel'],
      where: { status: 'approved' },
      _count: true
    });

    const statsBySubject = {};
    questionStats.forEach(stat => {
      if (!statsBySubject[stat.subjectId]) {
        statsBySubject[stat.subjectId] = {
          total: 0,
          byTopic: {},
          byBloomLevel: {}
        };
      }
      statsBySubject[stat.subjectId].total += stat._count;
      statsBySubject[stat.subjectId].byTopic[stat.topic] = 
        (statsBySubject[stat.subjectId].byTopic[stat.topic] || 0) + stat._count;
      statsBySubject[stat.subjectId].byBloomLevel[stat.bloomLevel] = 
        (statsBySubject[stat.subjectId].byBloomLevel[stat.bloomLevel] || 0) + stat._count;
    });

    res.json({
      status: 'success',
      data: {
        subjects: subjects.map(s => ({
          ...s,
          questionStats: statsBySubject[s.id] || { total: 0, byTopic: {}, byBloomLevel: {} }
        })),
        bloomLevels: [
          { value: 'nhan_biet', label: 'Nhận biết', description: 'Nhớ công thức, định nghĩa' },
          { value: 'thong_hieu', label: 'Thông hiểu', description: 'Giải thích, so sánh' },
          { value: 'van_dung', label: 'Vận dụng', description: 'Bài tập tính toán cơ bản' },
          { value: 'van_dung_cao', label: 'Vận dụng cao', description: 'Bài tập phức tạp' }
        ],
        questionTypes: [
          { value: 'trac_nghiem', label: 'Trắc nghiệm' },
          { value: 'tu_luan', label: 'Tự luận ngắn' }
        ],
        defaultTopics: [
          'dao_dong_co', 'song_co', 'dien_xoay_chieu', 
          'song_anh_sang', 'luong_tu_anh_sang', 'vat_ly_hat_nhan'
        ]
      }
    });
  } catch (error) {
    console.error('GetGenerationOptions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server'
    });
  }
};

module.exports = {
  explainQuestionHandler,
  stepSolutionHandler,
  generateQuestionHandler,
  generateExamHandler,
  saveGeneratedExam,
  getGenerationOptions
};
