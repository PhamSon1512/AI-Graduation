const prisma = require('../config/prisma');
const { getGroqClient, getGeminiModel, MODELS, BLOOM_LEVELS } = require('../config/ai.config');
const { Prisma } = require('@prisma/client');

// Cấu trúc đề thi thật TN THPT (tham chiếu)
const REAL_EXAM_BLOOM_WEIGHTS = {
  nhan_biet: 0.30,
  thong_hieu: 0.30,
  van_dung: 0.30,
  van_dung_cao: 0.10
};

const BLOOM_ORDER = ['nhan_biet', 'thong_hieu', 'van_dung', 'van_dung_cao'];

/**
 * Gọi AI (Groq) để sinh văn bản
 */
const callAiChat = async (prompt, maxTokens = 3000) => {
  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: MODELS.groq.text,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: maxTokens
    });
    return completion.choices[0]?.message?.content || '';
  } catch (e) {
    console.error('AI Chat error:', e);
    throw new Error('Không thể kết nối AI. Vui lòng thử lại sau.');
  }
};

/**
 * Thu thập dữ liệu bài thi thử (AssignmentAttempt) của học sinh
 */
const getStudentAttemptsData = async (studentId, subjectId = null) => {
  const where = {
    studentId,
    status: 'completed',
    score: { not: null }
  };

  const attempts = await prisma.assignmentAttempt.findMany({
    where,
    include: {
      assignment: {
        include: {
          exam: { include: { questions: { select: { id: true, bloomLevel: true } } } }
        }
      },
      answers: { include: { question: { select: { bloomLevel: true } } } }
    },
    orderBy: { submittedAt: 'desc' }
  });

  let filtered = attempts;
  if (subjectId) {
    const sid = parseInt(subjectId);
    filtered = attempts.filter(a => {
      if (a.assignment.examId && a.assignment.exam) {
        return a.assignment.exam.subjectId === sid;
      }
      const cfg = a.assignment.examConfig;
      return (typeof cfg === 'object' && cfg?.subjectId) ? cfg.subjectId === sid : false;
    });
  }

  return filtered.map(a => {
    const duration = a.assignment.durationMinutes * 60;
    const timeRatio = a.timeSpentSeconds && duration
      ? a.timeSpentSeconds / duration
      : null;
    const score = a.score ? Number(a.score) : null;

    let bloomBreakdown = {};
    if (a.answers?.length) {
      const byBloom = {};
      a.answers.forEach(ans => {
        const bl = ans.question?.bloomLevel || 'nhan_biet';
        if (!byBloom[bl]) byBloom[bl] = { correct: 0, total: 0 };
        byBloom[bl].total++;
        if (ans.isCorrect) byBloom[bl].correct++;
      });
      bloomBreakdown = byBloom;
    }

    return {
      id: a.id,
      score,
      timeSpentSeconds: a.timeSpentSeconds,
      durationMinutes: a.assignment.durationMinutes,
      timeRatio,
      submittedAt: a.submittedAt,
      assignmentTitle: a.assignment.title,
      totalQuestions: a.answers?.length || 0,
      bloomBreakdown
    };
  });
};

/**
 * Thu thập dữ liệu Practice của học sinh
 */
const getStudentPracticeData = async (studentId, subjectId = null) => {
  const where = { studentId, status: 'completed' };
  if (subjectId) where.subjectId = parseInt(subjectId);

  const sessions = await prisma.practiceSession.findMany({
    where,
    select: {
      id: true,
      score: true,
      totalQuestions: true,
      subjectId: true,
      completedAt: true
    },
    orderBy: { completedAt: 'desc' }
  });

  return sessions.map(s => ({
    score: s.score ? Number(s.score) : null,
    totalQuestions: s.totalQuestions,
    completedAt: s.completedAt
  }));
};

/**
 * Phân tích kết quả cá nhân - AI Analysis Module
 * GET /api/ai/analysis/student/:id
 */
const analyzeStudentPerformance = async (studentId, subjectId = null) => {
  const [student, attempts, practiceSessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: parseInt(studentId) },
      select: { id: true, fullName: true, email: true }
    }),
    getStudentAttemptsData(studentId, subjectId),
    getStudentPracticeData(studentId, subjectId)
  ]);

  if (!student || student.id === undefined) {
    throw new Error('Không tìm thấy học sinh');
  }

  const attemptScores = attempts.filter(a => a.score != null).map(a => a.score);
  const avgScore = attemptScores.length
    ? attemptScores.reduce((s, v) => s + v, 0) / attemptScores.length
    : null;

  const avgTimeRatio = attempts
    .filter(a => a.timeRatio != null)
    .map(a => a.timeRatio);
  const overallTimeRatio = avgTimeRatio.length
    ? avgTimeRatio.reduce((s, v) => s + v, 0) / avgTimeRatio.length
    : null;

  const bloomScores = {};
  attempts.forEach(a => {
    Object.entries(a.bloomBreakdown || {}).forEach(([bl, data]) => {
      if (!bloomScores[bl]) bloomScores[bl] = { correct: 0, total: 0 };
      bloomScores[bl].correct += data.correct || 0;
      bloomScores[bl].total += data.total || 0;
    });
  });

  const summary = {
    studentName: student.fullName,
    totalAttempts: attempts.length,
    totalPracticeSessions: practiceSessions.length,
    averageScore: avgScore ? Math.round(avgScore * 100) / 100 : null,
    timePattern: overallTimeRatio != null
      ? (overallTimeRatio < 0.7 ? 'nhanh' : overallTimeRatio > 1.1 ? 'cham' : 'vua')
      : null,
    bloomPerformance: Object.fromEntries(
      Object.entries(bloomScores).map(([bl, d]) => [
        bl,
        d.total > 0 ? Math.round((d.correct / d.total) * 10000) / 100 : null
      ])
    )
  };

  const prompt = `Bạn là chuyên gia giáo dục. Phân tích kết quả học tập của học sinh sau và đưa ra gợi ý cụ thể.

HỌC SINH: ${summary.studentName}
- Số bài thi thử đã làm: ${summary.totalAttempts}
- Số phiên luyện tập: ${summary.totalPracticeSessions}
- Điểm trung bình bài thi thử: ${summary.averageScore != null ? summary.averageScore + '/100' : 'Chưa có dữ liệu'}
- Tốc độ làm bài: ${summary.timePattern === 'nhanh' ? 'Làm nhanh hơn thời gian quy định' : summary.timePattern === 'cham' ? 'Làm chậm, cần cải thiện quản lý thời gian' : summary.timePattern === 'vua' ? 'Vừa phải' : 'Chưa rõ'}
- Điểm theo mức độ: ${JSON.stringify(summary.bloomPerformance)}

YÊU CẦU:
1. Phân tích ngắn gọn, khách quan (2-3 đoạn)
2. Chỉ ra điểm mạnh và điểm yếu
3. Đưa ra 2-4 gợi ý cụ thể để cải thiện. Mỗi gợi ý cần:
   - title: Tiêu đề ngắn
   - description: Mô tả chi tiết
   - actionType: "study_plan" (để FE forward đến lộ trình học)
4. Trả về JSON:
{
  "analysis": "Đoạn phân tích tổng quan",
  "suggestions": [
    { "title": "...", "description": "...", "actionType": "study_plan" }
  ]
}`;

  const aiResponse = await callAiChat(prompt, 2500);
  let parsed = { analysis: '', suggestions: [] };
  try {
    const match = aiResponse.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
  } catch (_) {
    parsed.analysis = aiResponse.substring(0, 1500);
  }

  return {
    student,
    summary,
    analysis: parsed.analysis || aiResponse,
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : []
  };
};

/**
 * Phân tích kết quả lớp - AI Analysis Module
 * GET /api/ai/analysis/class/:classId
 */
const analyzeClassPerformance = async (classId) => {
  const cls = await prisma.class.findUnique({
    where: { id: parseInt(classId) },
    include: {
      subject: { select: { id: true, name: true } },
      teacher: { select: { id: true, fullName: true } }
    }
  });

  if (!cls) throw new Error('Không tìm thấy lớp học');

  const enrollments = await prisma.classStudent.findMany({
    where: { classId: parseInt(classId), status: 'active' },
    select: { studentId: true }
  });
  const studentIds = enrollments.map(e => e.studentId);

  const attempts = await prisma.assignmentAttempt.findMany({
    where: {
      studentId: { in: studentIds },
      status: 'completed',
      score: { not: null },
      assignment: { classId: parseInt(classId) }
    },
    include: {
      student: { select: { id: true, fullName: true } },
      assignment: { select: { title: true } }
    }
  });

  const scores = attempts.map(a => Number(a.score));
  const avgScore = scores.length
    ? scores.reduce((s, v) => s + v, 0) / scores.length
    : null;

  const byStudent = {};
  attempts.forEach(a => {
    const sid = a.studentId;
    if (!byStudent[sid]) byStudent[sid] = { name: a.student?.fullName, scores: [] };
    byStudent[sid].scores.push(Number(a.score));
  });

  const studentAverages = Object.entries(byStudent).map(([sid, d]) => ({
    studentId: parseInt(sid),
    studentName: d.name,
    avgScore: d.scores.length ? d.scores.reduce((s, v) => s + v, 0) / d.scores.length : 0
  }));

  const summary = {
    className: cls.name,
    subjectName: cls.subject?.name,
    totalStudents: studentIds.length,
    totalAttempts: attempts.length,
    classAverageScore: avgScore ? Math.round(avgScore * 100) / 100 : null,
    studentAverages: studentAverages.sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))
  };

  const prompt = `Bạn là chuyên gia giáo dục. Phân tích kết quả học tập của lớp và đưa ra góp ý khách quan cho giáo viên.

LỚP: ${summary.className}
MÔN: ${summary.subjectName}
- Số học sinh: ${summary.totalStudents}
- Tổng số bài thi thử: ${summary.totalAttempts}
- Điểm trung bình cộng của lớp: ${summary.classAverageScore != null ? summary.classAverageScore + '/100' : 'Chưa có dữ liệu'}
- Top 5 học sinh điểm cao: ${studentAverages.slice(0, 5).map(s => `${s.studentName}: ${s.avgScore?.toFixed(1)}`).join(', ') || 'N/A'}
- Học sinh cần quan tâm (điểm thấp): ${studentAverages.slice(-3).reverse().map(s => `${s.studentName}: ${s.avgScore?.toFixed(1)}`).join(', ') || 'N/A'}

YÊU CẦU:
1. Phân tích khách quan, góp ý xây dựng (2-3 đoạn)
2. Đưa ra 2-4 gợi ý cho giáo viên. Mỗi gợi ý:
   - title: Tiêu đề ngắn
   - description: Mô tả chi tiết
   - actionType: "teaching_plan" hoặc "class_improvement"
3. Trả về JSON:
{
  "analysis": "Đoạn phân tích tổng quan",
  "suggestions": [
    { "title": "...", "description": "...", "actionType": "teaching_plan" }
  ]
}`;

  const aiResponse = await callAiChat(prompt, 2500);
  let parsed = { analysis: '', suggestions: [] };
  try {
    const match = aiResponse.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
  } catch (_) {
    parsed.analysis = aiResponse.substring(0, 1500);
  }

  return {
    class: cls,
    summary,
    analysis: parsed.analysis || aiResponse,
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : []
  };
};

/**
 * Dự đoán điểm thi - dựa trên điểm bài thi thử, cấu trúc đề, bloom level
 * GET /api/ai/predict-score
 */
const predictExamScore = async (studentId, subjectId = null) => {
  const attempts = await getStudentAttemptsData(studentId, subjectId);
  const validAttempts = attempts.filter(a => a.score != null && a.totalQuestions > 0);

  if (validAttempts.length === 0) {
    return {
      predictedScore: null,
      confidenceRange: null,
      factors: [],
      message: 'Cần ít nhất 1 bài thi thử hoàn thành để dự đoán điểm.'
    };
  }

  const weightedScores = [];
  const timeFactors = [];

  for (const a of validAttempts) {
    let bloomWeightedScore = 0;
    let totalWeight = 0;

    if (Object.keys(a.bloomBreakdown || {}).length > 0) {
      for (const [bloom, data] of Object.entries(a.bloomBreakdown)) {
        const realWeight = REAL_EXAM_BLOOM_WEIGHTS[bloom] ?? 0.25;
        const pct = data.total > 0 ? (data.correct / data.total) * 100 : 0;
        bloomWeightedScore += pct * realWeight;
        totalWeight += realWeight;
      }
      if (totalWeight > 0) {
        bloomWeightedScore = bloomWeightedScore / totalWeight;
      } else {
        bloomWeightedScore = a.score;
      }
    } else {
      bloomWeightedScore = a.score;
    }

    let timeAdjust = 0;
    if (a.timeRatio != null) {
      if (a.timeRatio > 1.1) timeAdjust = -2;
      else if (a.timeRatio < 0.6) timeAdjust = -1;
    }
    const adjustedScore = Math.max(0, Math.min(100, bloomWeightedScore + timeAdjust));
    weightedScores.push(adjustedScore);
    timeFactors.push(a.timeRatio);
  }

  const recentCount = Math.min(5, validAttempts.length);
  const recentScores = weightedScores.slice(0, recentCount);
  const avgPredicted = recentScores.reduce((s, v) => s + v, 0) / recentScores.length;
  const variance = recentScores.length > 1
    ? Math.sqrt(recentScores.reduce((s, v) => s + Math.pow(v - avgPredicted, 2), 0) / (recentScores.length - 1))
    : 5;
  const predictedScore = Math.round(avgPredicted * 10) / 10;
  const low = Math.max(0, Math.round((predictedScore - variance * 1.5) * 10) / 10);
  const high = Math.min(100, Math.round((predictedScore + variance * 1.5) * 10) / 10);

  const factors = [
    { factor: 'Điểm bài thi thử', value: `Trung bình ${avgPredicted.toFixed(1)}/100 từ ${validAttempts.length} bài` },
    { factor: 'Cấu trúc đề thật', value: 'Đã điều chỉnh theo phân bổ Bloom (30-30-30-10)' },
    { factor: 'Thời gian làm bài', value: validAttempts.some(a => a.timeRatio > 1.1)
      ? 'Làm chậm có thể ảnh hưởng điểm thi thật'
      : 'Quản lý thời gian ổn định' }
  ];

  const prompt = `Dựa trên dữ liệu: học sinh có ${validAttempts.length} bài thi thử, điểm dự đoán đã tính: ${predictedScore}/100 (khoảng ${low}-${high}). 

Hãy viết 1 đoạn ngắn (2-3 câu) giải thích dự đoán này một cách dễ hiểu cho học sinh, động viên và gợi ý cách cải thiện nếu điểm còn thấp. Chỉ trả về đoạn văn, không JSON.`;

  let explanation = '';
  try {
    explanation = await callAiChat(prompt, 500);
  } catch (_) {
    explanation = `Điểm dự kiến của bạn khoảng ${predictedScore}/100, dựa trên ${validAttempts.length} bài thi thử. Khoảng tin cậy: ${low}-${high}.`;
  }

  return {
    predictedScore,
    confidenceRange: { low, high },
    factors,
    attemptCount: validAttempts.length,
    explanation: explanation.trim()
  };
};

const ensureStudyPlanModel = () => {
  if (!prisma.studyPlan) {
    throw new Error(
      'Model StudyPlan chưa có trong Prisma Client. Vui lòng chạy: npx prisma generate && npx prisma migrate dev'
    );
  }
};

/**
 * Tạo hoặc lấy lộ trình học - AI Study Plan Module
 * GET /api/ai/study-plan
 */
const getOrCreateStudyPlan = async (studentId, subjectId = null) => {
  ensureStudyPlanModel();
  const existing = await prisma.studyPlan.findFirst({
    where: {
      studentId: parseInt(studentId),
      isActive: true,
      ...(subjectId ? { subjectId: parseInt(subjectId) } : { subjectId: null })
    },
    include: { subject: { select: { id: true, name: true } } },
    orderBy: { updatedAt: 'desc' }
  });

  if (existing) {
    return {
      ...existing,
      content: typeof existing.content === 'string' ? JSON.parse(existing.content) : existing.content,
      suggestions: typeof existing.suggestions === 'string' ? JSON.parse(existing.suggestions || '[]') : (existing.suggestions || [])
    };
  }

  const analysisResult = await analyzeStudentPerformance(studentId, subjectId);
  const student = analysisResult.student;

  const prompt = `Bạn là chuyên gia giáo dục. Tạo LỘ TRÌNH HỌC TẬP chi tiết cho học sinh dựa trên phân tích sau.

HỌC SINH: ${student.fullName}
- Điểm trung bình: ${analysisResult.summary.averageScore ?? 'Chưa có'}
- Tổng bài thi thử: ${analysisResult.summary.totalAttempts}
- Điểm theo mức độ: ${JSON.stringify(analysisResult.summary.bloomPerformance)}

Phân tích AI: ${analysisResult.analysis}

YÊU CẦU: Tạo lộ trình 4-6 bước cụ thể, mỗi bước có:
- week: số tuần (1, 2, 3...)
- title: Tiêu đề
- tasks: Mảng các task ngắn (vd: ["Ôn chủ đề X", "Làm 20 câu vận dụng"])
- focusArea: Chủ đề hoặc kỹ năng cần tập trung

Trả về JSON:
{
  "title": "Lộ trình cải thiện điểm số",
  "weeks": [
    { "week": 1, "title": "...", "tasks": ["..."], "focusArea": "..." }
  ]
}`;

  const aiResponse = await callAiChat(prompt, 2000);
  let planContent = { title: 'Lộ trình học tập', weeks: [] };
  try {
    const match = aiResponse.match(/\{[\s\S]*\}/);
    if (match) planContent = JSON.parse(match[0]);
  } catch (_) {
    planContent.rawText = aiResponse.substring(0, 2000);
  }

  const created = await prisma.studyPlan.create({
    data: {
      studentId: parseInt(studentId),
      subjectId: subjectId ? parseInt(subjectId) : null,
      title: planContent.title || 'Lộ trình học tập',
      content: planContent,
      suggestions: analysisResult.suggestions,
      source: 'ai_analysis',
      isActive: true
    },
    include: { subject: { select: { id: true, name: true } } }
  });

  return {
    ...created,
    content: typeof created.content === 'string' ? JSON.parse(created.content) : created.content,
    suggestions: typeof created.suggestions === 'string' ? JSON.parse(created.suggestions || '[]') : (created.suggestions || [])
  };
};

/**
 * Cập nhật lộ trình học - PUT /api/ai/study-plan
 */
const updateStudyPlan = async (studentId, updates) => {
  ensureStudyPlanModel();
  const plan = await prisma.studyPlan.findFirst({
    where: { studentId: parseInt(studentId), isActive: true },
    orderBy: { updatedAt: 'desc' }
  });

  if (!plan) {
    const newPlan = await getOrCreateStudyPlan(studentId, updates.subjectId);
    const content = updates.content ?? newPlan.content;
    const title = updates.title ?? newPlan.title;
    await prisma.studyPlan.update({
      where: { id: newPlan.id },
      data: { content, title, updatedAt: new Date() }
    });
    return { ...newPlan, content, title };
  }

  const data = {};
  if (updates.title) data.title = updates.title;
  if (updates.content) data.content = updates.content;
  if (Object.keys(data).length === 0) {
    return plan;
  }

  const updated = await prisma.studyPlan.update({
    where: { id: plan.id },
    data: { ...data, updatedAt: new Date() },
    include: { subject: { select: { id: true, name: true } } }
  });

  return {
    ...updated,
    content: typeof updated.content === 'string' ? JSON.parse(updated.content) : updated.content,
    suggestions: typeof updated.suggestions === 'string' ? JSON.parse(updated.suggestions || '[]') : (updated.suggestions || [])
  };
};

module.exports = {
  analyzeStudentPerformance,
  analyzeClassPerformance,
  predictExamScore,
  getOrCreateStudyPlan,
  updateStudyPlan
};
