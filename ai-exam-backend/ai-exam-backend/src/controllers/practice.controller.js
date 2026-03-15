const prisma = require('../config/prisma');
const { Prisma } = require('@prisma/client');

const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// @desc    Bắt đầu luyện tập
// @route   POST /api/practice/start
// @access  Student
const startPractice = async (req, res) => {
  try {
    const { subjectId, topicId, count = 20 } = req.body;
    const studentId = req.user.id;

    if (!subjectId) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng chọn môn học (subjectId)'
      });
    }

    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(subjectId) }
    });

    if (!subject) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy môn học'
      });
    }

    let topicCode = null;
    if (topicId) {
      const topic = await prisma.topic.findFirst({
        where: { id: parseInt(topicId), subjectId: parseInt(subjectId) }
      });
      if (!topic) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy chuyên đề'
        });
      }
      topicCode = topic.code;
    }

    const where = {
      subjectId: parseInt(subjectId),
      status: 'approved'
    };
    if (topicCode) {
      where.topic = topicCode;
    }

    const allQuestions = await prisma.question.findMany({
      where,
      select: {
        id: true,
        contentHtml: true,
        options: true,
        questionType: true,
        topic: true,
        bloomLevel: true,
        hasImage: true,
        imageUrl: true,
        imageDescription: true
      }
    });

    if (allQuestions.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: topicCode
          ? 'Không có câu hỏi nào cho môn học và chuyên đề này'
          : 'Không có câu hỏi nào cho môn học này'
      });
    }

    const shuffled = shuffleArray(allQuestions);
    const takeCount = Math.min(parseInt(count) || 20, shuffled.length, 50);
    const selected = shuffled.slice(0, takeCount);

    const session = await prisma.practiceSession.create({
      data: {
        studentId,
        subjectId: parseInt(subjectId),
        topicId: topicId ? parseInt(topicId) : null,
        status: 'in_progress',
        totalQuestions: takeCount,
        questions: {
          create: selected.map((q, idx) => ({
            questionId: q.id,
            orderNumber: idx + 1
          }))
        }
      },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        topic: { select: { id: true, code: true, name: true } }
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Bắt đầu luyện tập thành công',
      data: {
        sessionId: session.id,
        subject: session.subject,
        topic: session.topic,
        totalQuestions: takeCount,
        status: session.status
      }
    });
  } catch (error) {
    console.error('StartPractice error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi bắt đầu luyện tập'
    });
  }
};

// @desc    Lấy câu hỏi luyện tập (không có đáp án đúng + lời giải trước khi nộp bài)
// @route   GET /api/practice/:sessionId/questions
// @access  Student
const getPracticeQuestions = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.user.id;

    const session = await prisma.practiceSession.findFirst({
      where: { id: parseInt(sessionId), studentId },
      include: {
        questions: {
          orderBy: { orderNumber: 'asc' },
          include: {
            question: {
              select: {
                id: true,
                contentHtml: true,
                options: true,
                questionType: true,
                topic: true,
                bloomLevel: true,
                hasImage: true,
                imageUrl: true,
                imageDescription: true
              }
            }
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy phiên luyện tập'
      });
    }

    const questions = session.questions.map((pq, idx) => ({
      orderNumber: pq.orderNumber,
      sessionQuestionId: pq.id,
      studentAnswer: pq.studentAnswer,
      question: {
        id: pq.question.id,
        contentHtml: pq.question.contentHtml,
        options: pq.question.options,
        questionType: pq.question.questionType,
        topic: pq.question.topic,
        bloomLevel: pq.question.bloomLevel,
        hasImage: pq.question.hasImage,
        imageUrl: pq.question.imageUrl,
        imageDescription: pq.question.imageDescription
      }
    }));

    res.json({
      status: 'success',
      data: {
        sessionId: session.id,
        status: session.status,
        totalQuestions: session.totalQuestions,
        questions
      }
    });
  } catch (error) {
    console.error('GetPracticeQuestions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi lấy câu hỏi'
    });
  }
};

// @desc    Lưu tiến độ luyện tập (đáp án từng câu)
// @route   PATCH /api/practice/:sessionId/progress
// @access  Student
const updateProgress = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answers } = req.body;
    const studentId = req.user.id;

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        status: 'error',
        message: 'answers phải là mảng [{sessionQuestionId, selectedAnswer}, ...]'
      });
    }

    const session = await prisma.practiceSession.findFirst({
      where: { id: parseInt(sessionId), studentId }
    });

    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy phiên luyện tập'
      });
    }

    if (session.status === 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Phiên đã hoàn thành, không thể cập nhật tiến độ'
      });
    }

    const sessionQuestionIds = (await prisma.practiceSessionQuestion.findMany({
      where: { sessionId: parseInt(sessionId) },
      select: { id: true }
    })).map(q => q.id);

    for (const { sessionQuestionId, selectedAnswer } of answers) {
      if (!sessionQuestionIds.includes(parseInt(sessionQuestionId))) continue;

      await prisma.practiceSessionQuestion.updateMany({
        where: {
          id: parseInt(sessionQuestionId),
          sessionId: parseInt(sessionId)
        },
        data: {
          studentAnswer: selectedAnswer ? String(selectedAnswer).trim().toUpperCase().slice(0, 1) : null
        }
      });
    }

    res.json({
      status: 'success',
      message: 'Đã lưu tiến độ'
    });
  } catch (error) {
    console.error('UpdateProgress error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi lưu tiến độ'
    });
  }
};

// @desc    Nộp bài luyện tập
// @route   POST /api/practice/:sessionId/submit
// @access  Student
const submitPractice = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answers } = req.body;
    const studentId = req.user.id;

    const session = await prisma.practiceSession.findFirst({
      where: { id: parseInt(sessionId), studentId },
      include: {
        questions: {
          orderBy: { orderNumber: 'asc' },
          include: { question: true }
        }
      }
    });

    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy phiên luyện tập'
      });
    }

    if (session.status === 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Phiên đã được nộp trước đó'
      });
    }

    const answerMap = Array.isArray(answers)
      ? answers.reduce((acc, { sessionQuestionId, questionId, selectedAnswer }) => {
          const key = sessionQuestionId || questionId;
          if (key) acc[key] = selectedAnswer;
          return acc;
        }, {})
      : {};

    let correctCount = 0;

    for (const pq of session.questions) {
      const chosen = answerMap[pq.id] ?? answerMap[pq.questionId] ?? pq.studentAnswer;
      const correctAnswer = pq.question.correctAnswer;
      const normalizedChosen = chosen ? String(chosen).trim().toUpperCase().slice(0, 1) : null;
      const isCorrect = correctAnswer && normalizedChosen === String(correctAnswer).trim().toUpperCase();

      if (isCorrect) correctCount++;

      await prisma.practiceSessionQuestion.update({
        where: { id: pq.id },
        data: {
          studentAnswer: normalizedChosen,
          isCorrect
        }
      });
    }

    const score = session.totalQuestions > 0
      ? new Prisma.Decimal((correctCount / session.totalQuestions) * 100).toDecimalPlaces(2)
      : new Prisma.Decimal(0);

    await prisma.practiceSession.update({
      where: { id: parseInt(sessionId) },
      data: {
        status: 'completed',
        score,
        completedAt: new Date()
      }
    });

    res.json({
      status: 'success',
      message: 'Nộp bài thành công',
      data: {
        sessionId: parseInt(sessionId),
        totalQuestions: session.totalQuestions,
        correctCount,
        score: Number(score)
      }
    });
  } catch (error) {
    console.error('SubmitPractice error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi nộp bài'
    });
  }
};

// @desc    Xem kết quả luyện tập (kèm lời giải chi tiết)
// @route   GET /api/practice/:sessionId/result
// @access  Student
const getPracticeResult = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.user.id;

    const session = await prisma.practiceSession.findFirst({
      where: { id: parseInt(sessionId), studentId },
      include: {
        subject: { select: { id: true, code: true, name: true } },
        topic: { select: { id: true, code: true, name: true } },
        questions: {
          orderBy: { orderNumber: 'asc' },
          include: {
            question: {
              select: {
                id: true,
                contentHtml: true,
                options: true,
                questionType: true,
                topic: true,
                bloomLevel: true,
                correctAnswer: true,
                explanationHtml: true,
                hasImage: true,
                imageUrl: true,
                imageDescription: true
              }
            }
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy phiên luyện tập'
      });
    }

    const questions = session.questions.map(pq => ({
      orderNumber: pq.orderNumber,
      question: {
        ...pq.question,
        correctAnswer: pq.question.correctAnswer,
        explanationHtml: pq.question.explanationHtml
      },
      studentAnswer: pq.studentAnswer,
      isCorrect: pq.isCorrect
    }));

    res.json({
      status: 'success',
      data: {
        sessionId: session.id,
        subject: session.subject,
        topic: session.topic,
        status: session.status,
        totalQuestions: session.totalQuestions,
        score: session.score ? Number(session.score) : null,
        completedAt: session.completedAt,
        questions
      }
    });
  } catch (error) {
    console.error('GetPracticeResult error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi lấy kết quả'
    });
  }
};

// @desc    Xem lịch sử luyện tập
// @route   GET /api/practice/history
// @access  Student
const getPracticeHistory = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 50);
    const skip = (pageNum - 1) * limitNum;

    const [sessions, total] = await Promise.all([
      prisma.practiceSession.findMany({
        where: { studentId },
        include: {
          subject: { select: { id: true, code: true, name: true } },
          topic: { select: { id: true, code: true, name: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.practiceSession.count({ where: { studentId } })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      status: 'success',
      data: {
        sessions: sessions.map(s => ({
          id: s.id,
          subject: s.subject,
          topic: s.topic,
          status: s.status,
          totalQuestions: s.totalQuestions,
          score: s.score ? Number(s.score) : null,
          createdAt: s.createdAt,
          completedAt: s.completedAt
        })),
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount: total,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('GetPracticeHistory error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi lấy lịch sử'
    });
  }
};

module.exports = {
  startPractice,
  getPracticeQuestions,
  updateProgress,
  submitPractice,
  getPracticeResult,
  getPracticeHistory
};
