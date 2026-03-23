const prisma = require('../config/prisma');
const { Prisma } = require('@prisma/client');
const { generateRandomQuestionsByConfig } = require('../services/assignment.random.service');

// @desc    Tạo assignment (giao bài tập / thi thử)
// @route   POST /api/assignments
// @access  Teacher
const createAssignment = async (req, res) => {
  try {
    const { classId, examId, title, description, assignmentType, examConfig, deadline, durationMinutes } = req.body;
    const teacherId = req.user.id;

    if (!classId || !title || !assignmentType) {
      return res.status(400).json({
        status: 'error',
        message: 'Thiếu classId, title hoặc assignmentType'
      });
    }

    if (!['fixed_exam', 'random_config'].includes(assignmentType)) {
      return res.status(400).json({
        status: 'error',
        message: 'assignmentType phải là fixed_exam hoặc random_config'
      });
    }

    const cls = await prisma.class.findFirst({
      where: {
        id: parseInt(classId),
        deletedAt: null,
        ...(req.user.role === 'teacher' ? { teacherId } : {})
      }
    });

    if (!cls) {
      return res.status(404).json({ status: 'error', message: 'Không tìm thấy lớp' });
    }

    if (assignmentType === 'fixed_exam') {
      if (!examId) {
        return res.status(400).json({
          status: 'error',
          message: 'fixed_exam cần examId'
        });
      }
      const exam = await prisma.exam.findFirst({
        where: { id: parseInt(examId), status: 'approved' }
      });
      if (!exam) {
        return res.status(404).json({ status: 'error', message: 'Không tìm thấy đề thi đã duyệt' });
      }
    } else {
      if (!examConfig || !examConfig.subjectId) {
        return res.status(400).json({
          status: 'error',
          message: 'random_config cần examConfig với subjectId, totalQuestions, distribution'
        });
      }
    }

    const assignment = await prisma.assignment.create({
      data: {
        classId: parseInt(classId),
        teacherId: cls.teacherId,
        examId: assignmentType === 'fixed_exam' ? parseInt(examId) : null,
        title,
        description: description || null,
        assignmentType,
        examConfig: assignmentType === 'random_config' ? examConfig : null,
        deadline: deadline ? new Date(deadline) : null,
        durationMinutes: parseInt(durationMinutes) || 60,
        status: 'published'
      },
      include: {
        class: { select: { id: true, name: true, code: true } },
        exam: { select: { id: true, code: true, title: true } }
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Giao bài thành công',
      data: assignment
    });
  } catch (error) {
    console.error('CreateAssignment error:', error);
    res.status(500).json({ status: 'error', message: 'Lỗi server' });
  }
};

// @desc    Cập nhật assignment
// @route   PUT /api/assignments/:id
// @access  Teacher
const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, deadline, durationMinutes } = req.body;

    const assignment = await prisma.assignment.findFirst({
      where: { id: parseInt(id) },
      include: { class: true }
    });

    if (!assignment) {
      return res.status(404).json({ status: 'error', message: 'Không tìm thấy bài tập' });
    }

    if (req.user.role === 'teacher' && assignment.teacherId !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Không có quyền sửa' });
    }

    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null;
    if (durationMinutes !== undefined) data.durationMinutes = parseInt(durationMinutes);

    const updated = await prisma.assignment.update({
      where: { id: parseInt(id) },
      data
    });

    res.json({ status: 'success', message: 'Cập nhật thành công', data: updated });
  } catch (error) {
    console.error('UpdateAssignment error:', error);
    res.status(500).json({ status: 'error', message: 'Lỗi server' });
  }
};

// @desc    Xóa assignment
// @route   DELETE /api/assignments/:id
// @access  Teacher
const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.assignment.findUnique({
      where: { id: parseInt(id) }
    });

    if (!assignment) {
      return res.status(404).json({ status: 'error', message: 'Không tìm thấy bài tập' });
    }

    if (req.user.role === 'teacher' && assignment.teacherId !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Không có quyền xóa' });
    }

    await prisma.assignment.delete({ where: { id: parseInt(id) } });
    res.json({ status: 'success', message: 'Xóa thành công' });
  } catch (error) {
    console.error('DeleteAssignment error:', error);
    res.status(500).json({ status: 'error', message: 'Lỗi server' });
  }
};

// @desc    Danh sách assignment (Teacher: của mình, Student: lớp mình học)
// @route   GET /api/assignments
// @access  Teacher / Student
const getAssignments = async (req, res) => {
  try {
    const { classId, page = 1, limit = 20 } = req.query;
    const user = req.user;

    if (user.role === 'teacher') {
      const where = { teacherId: user.id };
      if (classId) where.classId = parseInt(classId);

      const [items, total] = await Promise.all([
        prisma.assignment.findMany({
          where,
          include: {
            class: { select: { id: true, name: true, code: true } },
            exam: { select: { id: true, code: true, title: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: Math.min(parseInt(limit), 50)
        }),
        prisma.assignment.count({ where })
      ]);
      return res.json({
        status: 'success',
        data: {
          assignments: items,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    }

    if (user.role === 'student') {
      const enrollments = await prisma.classStudent.findMany({
        where: { studentId: user.id, status: 'active' },
        select: { classId: true }
      });
      const classIds = enrollments.map(e => e.classId);
      if (classIds.length === 0) {
        return res.json({
          status: 'success',
          data: { assignments: [], pagination: { page: 1, limit: parseInt(limit), total: 0, totalPages: 0 } }
        });
      }

      const where = {
        classId: { in: classIds },
        status: 'published'
      };
      if (classId) where.classId = parseInt(classId);

      const [items, total] = await Promise.all([
        prisma.assignment.findMany({
          where,
          include: {
            class: { select: { id: true, name: true, code: true } },
            exam: { select: { id: true, code: true, title: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: Math.min(parseInt(limit), 50)
        }),
        prisma.assignment.count({ where })
      ]);

      const assignmentIds = items.map((a) => a.id);
      const attempts =
        assignmentIds.length > 0
          ? await prisma.assignmentAttempt.findMany({
              where: {
                studentId: user.id,
                assignmentId: { in: assignmentIds }
              }
            })
          : [];
      const attemptByAssignmentId = new Map(attempts.map((att) => [att.assignmentId, att]));
      const withAttempt = items.map((a) => ({
        ...a,
        myAttempt: attemptByAssignmentId.get(a.id) ?? null
      }));

      return res.json({
        status: 'success',
        data: {
          assignments: withAttempt,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    }

    res.status(403).json({ status: 'error', message: 'Không có quyền' });
  } catch (error) {
    console.error('GetAssignments error:', error);
    res.status(500).json({ status: 'error', message: 'Lỗi server' });
  }
};

// @desc    Danh sách assignment theo lớp (Teacher)
// @route   GET /api/classes/:classId/assignments
// @access  Teacher
const getAssignmentsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user.id;

    const cls = await prisma.class.findFirst({
      where: {
        id: parseInt(classId),
        deletedAt: null,
        ...(req.user.role === 'teacher' ? { teacherId: req.user.id } : {})
      }
    });
    if (!cls) {
      return res.status(404).json({ status: 'error', message: 'Không tìm thấy lớp' });
    }

    const items = await prisma.assignment.findMany({
      where: { classId: parseInt(classId) },
      include: {
        exam: { select: { id: true, code: true, title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ status: 'success', data: { assignments: items } });
  } catch (error) {
    console.error('GetAssignmentsByClass error:', error);
    res.status(500).json({ status: 'error', message: 'Lỗi server' });
  }
};

// @desc    Chi tiết assignment
// @route   GET /api/assignments/:id
// @access  Teacher / Student
const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await prisma.assignment.findUnique({
      where: { id: parseInt(id) },
      include: {
        class: { select: { id: true, name: true, code: true } },
        exam: { select: { id: true, code: true, title: true } }
      }
    });

    if (!assignment) {
      return res.status(404).json({ status: 'error', message: 'Không tìm thấy bài tập' });
    }

    if (req.user.role === 'student') {
      const attempt = await prisma.assignmentAttempt.findUnique({
        where: {
          assignmentId_studentId: { assignmentId: parseInt(id), studentId: req.user.id }
        }
      });
      return res.json({ status: 'success', data: { ...assignment, myAttempt: attempt } });
    }

    res.json({ status: 'success', data: assignment });
  } catch (error) {
    console.error('GetAssignmentById error:', error);
    res.status(500).json({ status: 'error', message: 'Lỗi server' });
  }
};

// @desc    Bắt đầu làm bài
// @route   POST /api/assignments/:id/start
// @access  Student
const startAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    const assignment = await prisma.assignment.findUnique({
      where: { id: parseInt(id) },
      include: { class: true }
    });

    if (!assignment || assignment.status !== 'published') {
      return res.status(404).json({ status: 'error', message: 'Không tìm thấy bài tập' });
    }

    const isInClass = await prisma.classStudent.findUnique({
      where: {
        classId_studentId: { classId: assignment.classId, studentId },
        status: 'active'
      }
    });
    if (!isInClass) {
      return res.status(403).json({ status: 'error', message: 'Bạn không thuộc lớp này' });
    }

    const existing = await prisma.assignmentAttempt.findUnique({
      where: {
        assignmentId_studentId: { assignmentId: parseInt(id), studentId }
      }
    });

    if (existing) {
      if (existing.status === 'completed') {
        return res.status(400).json({
          status: 'error',
          message: 'Bạn đã hoàn thành bài này',
          data: { attemptId: existing.id }
        });
      }
      return res.json({
        status: 'success',
        message: 'Tiếp tục làm bài',
        data: {
          attemptId: existing.id,
          startedAt: existing.startedAt,
          durationMinutes: assignment.durationMinutes,
          totalQuestions: assignment.assignmentType === 'fixed_exam'
            ? assignment.exam?.totalQuestions || 0
            : (existing.questions?.length || 0)
        }
      });
    }

    if (assignment.assignmentType === 'fixed_exam') {
      const exam = await prisma.exam.findUnique({
        where: { id: assignment.examId },
        include: {
          questions: {
            orderBy: { orderNumber: 'asc' },
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
      });
      if (!exam || !exam.questions?.length) {
        return res.status(400).json({ status: 'error', message: 'Đề thi không có câu hỏi' });
      }

      const attempt = await prisma.assignmentAttempt.create({
        data: {
          assignmentId: parseInt(id),
          studentId,
          examId: assignment.examId
        }
      });

      const questions = exam.questions.map((q, idx) => ({
        orderNumber: idx + 1,
        question: { ...q }
      }));

      return res.status(201).json({
        status: 'success',
        message: 'Bắt đầu làm bài',
        data: {
          attemptId: attempt.id,
          startedAt: attempt.startedAt,
          durationMinutes: assignment.durationMinutes,
          totalQuestions: questions.length,
          questions
        }
      });
    }

    const questionList = await generateRandomQuestionsByConfig(assignment.examConfig);
    if (questionList.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Không đủ câu hỏi theo cấu hình. Vui lòng kiểm tra môn học và chuyên đề.'
      });
    }

    const attempt = await prisma.assignmentAttempt.create({
      data: {
        assignmentId: parseInt(id),
        studentId,
        questions: {
          create: questionList.map(({ id: questionId, orderNumber }) => ({
            questionId,
            orderNumber
          }))
        }
      },
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

    const questions = attempt.questions.map((pq) => ({
      orderNumber: pq.orderNumber,
      question: pq.question
    }));

    res.status(201).json({
      status: 'success',
      message: 'Bắt đầu làm bài',
      data: {
        attemptId: attempt.id,
        startedAt: attempt.startedAt,
        durationMinutes: assignment.durationMinutes,
        totalQuestions: questions.length,
        questions
      }
    });
  } catch (error) {
    console.error('StartAssignment error:', error);
    res.status(500).json({ status: 'error', message: 'Lỗi server' });
  }
};

// @desc    Lấy câu hỏi (sau khi đã start)
// @route   GET /api/assignments/:id/questions
// @access  Student
const getAssignmentQuestions = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    const attempt = await prisma.assignmentAttempt.findFirst({
      where: {
        assignmentId: parseInt(id),
        studentId
      },
      include: {
        assignment: { include: { exam: true } },
        answers: true,
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

    if (!attempt) {
      return res.status(404).json({ status: 'error', message: 'Chưa bắt đầu làm bài. Gọi POST start trước.' });
    }

    if (attempt.assignment.assignmentType === 'fixed_exam' && attempt.examId) {
      const exam = await prisma.exam.findUnique({
        where: { id: attempt.examId },
        include: {
          questions: {
            orderBy: { orderNumber: 'asc' },
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
      });
      const questions = (exam?.questions || []).map((q, idx) => ({
        orderNumber: idx + 1,
        question: q,
        answer: attempt.answers?.find((a) => a.questionId === q.id)
      }));
      return res.json({
        status: 'success',
        data: {
          attemptId: attempt.id,
          status: attempt.status,
          totalQuestions: questions.length,
          durationMinutes: attempt.assignment.durationMinutes,
          questions
        }
      });
    }

    const questions = attempt.questions.map((pq) => ({
      orderNumber: pq.orderNumber,
      question: pq.question,
      answer: attempt.answers?.find((a) => a.questionId === pq.questionId)
    }));

    res.json({
      status: 'success',
      data: {
        attemptId: attempt.id,
        status: attempt.status,
        totalQuestions: questions.length,
        durationMinutes: attempt.assignment.durationMinutes,
        questions
      }
    });
  } catch (error) {
    console.error('GetAssignmentQuestions error:', error);
    res.status(500).json({ status: 'error', message: 'Lỗi server' });
  }
};

// @desc    Nộp bài
// @route   POST /api/assignments/:id/submit
// @access  Student
const submitAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers, timeSpentSeconds } = req.body;
    const studentId = req.user.id;

    const attempt = await prisma.assignmentAttempt.findFirst({
      where: {
        assignmentId: parseInt(id),
        studentId
      },
      include: {
        assignment: { include: { exam: true } },
        questions: { include: { question: true } }
      }
    });

    if (!attempt) {
      return res.status(404).json({ status: 'error', message: 'Chưa bắt đầu làm bài' });
    }

    if (attempt.status === 'completed') {
      return res.status(400).json({ status: 'error', message: 'Đã nộp bài trước đó' });
    }

    let questionList = [];
    if (attempt.examId) {
      const exam = await prisma.exam.findUnique({
        where: { id: attempt.examId },
        include: { questions: true }
      });
      questionList = (exam?.questions || []).map((q, idx) => ({ ...q, orderNumber: idx + 1 }));
    } else {
      questionList = attempt.questions.map((pq) => ({ ...pq.question, orderNumber: pq.orderNumber }));
    }

    const answerMap = Array.isArray(answers)
      ? answers.reduce((acc, item) => {
          const qid = item.questionId ?? item.sessionQuestionId;
          if (qid) acc[qid] = item.selectedAnswer ?? item.answer;
          return acc;
        }, {})
      : {};

    let correctCount = 0;

    for (const q of questionList) {
      const chosen = answerMap[q.id] ?? attempt.answers?.find((a) => a.questionId === q.id)?.studentAnswer;
      const norm = chosen ? String(chosen).trim().toUpperCase().slice(0, 1) : null;
      const correct = q.correctAnswer && norm === String(q.correctAnswer).trim().toUpperCase();

      if (correct) correctCount++;

      await prisma.assignmentAttemptAnswer.upsert({
        where: {
          attemptId_questionId: { attemptId: attempt.id, questionId: q.id }
        },
        create: {
          attemptId: attempt.id,
          questionId: q.id,
          studentAnswer: norm,
          isCorrect: correct
        },
        update: {
          studentAnswer: norm,
          isCorrect: correct
        }
      });
    }

    const total = questionList.length;
    const score = total > 0 ? new Prisma.Decimal((correctCount / total) * 100).toDecimalPlaces(2) : new Prisma.Decimal(0);

    await prisma.assignmentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'completed',
        submittedAt: new Date(),
        timeSpentSeconds: parseInt(timeSpentSeconds) || null,
        score
      }
    });

    res.json({
      status: 'success',
      message: 'Nộp bài thành công',
      data: {
        attemptId: attempt.id,
        totalQuestions: total,
        correctCount,
        score: Number(score),
        timeSpentSeconds: parseInt(timeSpentSeconds) || null
      }
    });
  } catch (error) {
    console.error('SubmitAssignment error:', error);
    res.status(500).json({ status: 'error', message: 'Lỗi server' });
  }
};

// @desc    Xem kết quả
// @route   GET /api/assignments/:id/result
// @access  Student
const getAssignmentResult = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    const attempt = await prisma.assignmentAttempt.findFirst({
      where: {
        assignmentId: parseInt(id),
        studentId,
        status: 'completed'
      },
      include: {
        assignment: { include: { class: true } },
        answers: { include: { question: true } },
        questions: { orderBy: { orderNumber: 'asc' }, include: { question: true } }
      }
    });

    if (!attempt) {
      return res.status(404).json({ status: 'error', message: 'Chưa nộp bài hoặc không tìm thấy kết quả' });
    }

    let items = [];
    if (attempt.questions?.length > 0) {
      items = attempt.questions.map((pq) => {
        const ans = attempt.answers?.find((a) => a.questionId === pq.questionId);
        return {
          orderNumber: pq.orderNumber,
          question: {
            ...pq.question,
            correctAnswer: pq.question.correctAnswer,
            explanationHtml: pq.question.explanationHtml
          },
          studentAnswer: ans?.studentAnswer,
          isCorrect: ans?.isCorrect
        };
      });
    } else if (attempt.examId) {
      const exam = await prisma.exam.findUnique({
        where: { id: attempt.examId },
        include: { questions: { orderBy: { orderNumber: 'asc' } } }
      });
      items = (exam?.questions || []).map((q, idx) => {
        const ans = attempt.answers?.find((a) => a.questionId === q.id);
        return {
          orderNumber: idx + 1,
          question: {
            ...q,
            correctAnswer: q.correctAnswer,
            explanationHtml: q.explanationHtml
          },
          studentAnswer: ans?.studentAnswer,
          isCorrect: ans?.isCorrect
        };
      });
    }

    res.json({
      status: 'success',
      data: {
        attemptId: attempt.id,
        assignment: attempt.assignment,
        totalQuestions: items.length,
        score: attempt.score ? Number(attempt.score) : null,
        timeSpentSeconds: attempt.timeSpentSeconds,
        submittedAt: attempt.submittedAt,
        questions: items
      }
    });
  } catch (error) {
    console.error('GetAssignmentResult error:', error);
    res.status(500).json({ status: 'error', message: 'Lỗi server' });
  }
};

// @desc    Theo dõi tiến độ (Teacher)
// @route   GET /api/assignments/:id/progress
// @access  Teacher
const getAssignmentProgress = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.assignment.findFirst({
      where: { id: parseInt(id) },
      include: {
        class: {
          include: {
            students: {
              where: { status: 'active' },
              include: { student: { select: { id: true, fullName: true, email: true } } }
            }
          }
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({ status: 'error', message: 'Không tìm thấy bài tập' });
    }

    if (req.user.role === 'teacher' && assignment.teacherId !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Không có quyền' });
    }

    const attempts = await prisma.assignmentAttempt.findMany({
      where: { assignmentId: parseInt(id) },
      include: { student: { select: { id: true, fullName: true, email: true } } }
    });

    const attemptMap = attempts.reduce((acc, a) => {
      acc[a.studentId] = a;
      return acc;
    }, {});

    const students = assignment.class.students.map((cs) => {
      const a = attemptMap[cs.studentId];
      return {
        student: cs.student,
        attempted: !!a,
        status: a?.status,
        score: a?.score ? Number(a.score) : null,
        timeSpentSeconds: a?.timeSpentSeconds,
        submittedAt: a?.submittedAt
      };
    });

    const stats = {
      totalStudents: students.length,
      completed: students.filter((s) => s.status === 'completed').length,
      inProgress: students.filter((s) => s.status === 'in_progress').length,
      notStarted: students.filter((s) => !s.attempted).length,
      averageScore: null
    };

    const completedScores = students.filter((s) => s.score != null).map((s) => s.score);
    if (completedScores.length > 0) {
      stats.averageScore = completedScores.reduce((a, b) => a + b, 0) / completedScores.length;
    }

    res.json({
      status: 'success',
      data: {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          assignmentType: assignment.assignmentType
        },
        stats,
        students
      }
    });
  } catch (error) {
    console.error('GetAssignmentProgress error:', error);
    res.status(500).json({ status: 'error', message: 'Lỗi server' });
  }
};

module.exports = {
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignments,
  getAssignmentsByClass,
  getAssignmentById,
  startAssignment,
  getAssignmentQuestions,
  submitAssignment,
  getAssignmentResult,
  getAssignmentProgress
};
