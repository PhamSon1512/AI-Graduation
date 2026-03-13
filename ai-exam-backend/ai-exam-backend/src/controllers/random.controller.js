const prisma = require('../config/prisma');

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// @desc    Get random questions by distribution
// @route   POST /api/questions/random
// @access  Teacher/Admin (for creating practice exams)
const getRandomQuestions = async (req, res) => {
  try {
    const {
      subjectId,
      totalQuestions = 50,
      distribution,
      excludeExamIds = [],
      topicDistribution
    } = req.body;

    if (!subjectId) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng cung cấp subjectId'
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

    const defaultDistribution = {
      nhan_biet: { count: Math.floor(totalQuestions * 0.3), trac_nghiem: null, tu_luan: 0 },
      thong_hieu: { count: Math.floor(totalQuestions * 0.3), trac_nghiem: null, tu_luan: 2 },
      van_dung: { count: Math.floor(totalQuestions * 0.25), trac_nghiem: null, tu_luan: 3 },
      van_dung_cao: { count: Math.floor(totalQuestions * 0.15), trac_nghiem: null, tu_luan: 2 }
    };

    const dist = distribution || defaultDistribution;

    const allApprovedQuestions = await prisma.question.findMany({
      where: {
        subjectId: parseInt(subjectId),
        status: 'approved',
        examId: excludeExamIds.length > 0 ? { notIn: excludeExamIds.map(id => parseInt(id)) } : undefined
      },
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
    });

    if (allApprovedQuestions.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Không có câu hỏi nào đã được duyệt cho môn học này'
      });
    }

    const groupedByBloomAndType = {};
    const groupedByTopic = {};

    allApprovedQuestions.forEach(q => {
      const key = `${q.bloomLevel}_${q.questionType}`;
      if (!groupedByBloomAndType[key]) {
        groupedByBloomAndType[key] = [];
      }
      groupedByBloomAndType[key].push(q);

      if (!groupedByTopic[q.topic]) {
        groupedByTopic[q.topic] = [];
      }
      groupedByTopic[q.topic].push(q);
    });

    const selectedQuestions = [];
    const warnings = [];
    const summary = {
      requested: 0,
      actual: 0,
      byBloomLevel: {},
      byTopic: {}
    };

    for (const [bloomLevel, config] of Object.entries(dist)) {
      const { count, trac_nghiem, tu_luan = 0 } = config;
      if (!count || count <= 0) continue;

      summary.requested += count;
      summary.byBloomLevel[bloomLevel] = { requested: count, actual: 0, byType: {} };

      const tuLuanCount = tu_luan || 0;
      const tracNghiemCount = trac_nghiem !== null ? trac_nghiem : (count - tuLuanCount);

      for (const [type, typeCount] of [['trac_nghiem', tracNghiemCount], ['tu_luan', tuLuanCount]]) {
        if (typeCount <= 0) continue;

        const key = `${bloomLevel}_${type}`;
        let availableQuestions = groupedByBloomAndType[key] || [];

        availableQuestions = availableQuestions.filter(
          q => !selectedQuestions.find(sq => sq.id === q.id)
        );

        if (topicDistribution && Object.keys(topicDistribution).length > 0) {
          const selectedByTopic = balanceByTopic(availableQuestions, typeCount, topicDistribution);
          selectedQuestions.push(...selectedByTopic);
          summary.byBloomLevel[bloomLevel].actual += selectedByTopic.length;
          summary.byBloomLevel[bloomLevel].byType[type] = {
            requested: typeCount,
            actual: selectedByTopic.length
          };

          if (selectedByTopic.length < typeCount) {
            warnings.push(`Thiếu ${typeCount - selectedByTopic.length} câu ${type} mức ${bloomLevel}`);
          }
        } else {
          const shuffled = shuffleArray(availableQuestions);
          const selected = shuffled.slice(0, typeCount);
          selectedQuestions.push(...selected);
          summary.byBloomLevel[bloomLevel].actual += selected.length;
          summary.byBloomLevel[bloomLevel].byType[type] = {
            requested: typeCount,
            actual: selected.length
          };

          if (selected.length < typeCount) {
            warnings.push(`Thiếu ${typeCount - selected.length} câu ${type} mức ${bloomLevel}`);
          }
        }
      }
    }

    selectedQuestions.forEach(q => {
      summary.byTopic[q.topic] = (summary.byTopic[q.topic] || 0) + 1;
    });

    const maxTopicCount = Math.ceil(selectedQuestions.length * 0.4);
    const topicCounts = Object.entries(summary.byTopic);
    const overRepresentedTopics = topicCounts.filter(([_, count]) => count > maxTopicCount);

    if (overRepresentedTopics.length > 0) {
      overRepresentedTopics.forEach(([topic, count]) => {
        warnings.push(`Topic "${topic}" có ${count} câu (>${maxTopicCount}), có thể mất cân bằng`);
      });
    }

    summary.actual = selectedQuestions.length;

    const finalQuestions = shuffleArray(selectedQuestions).map((q, index) => ({
      ...q,
      orderNumber: index + 1
    }));

    res.json({
      status: 'success',
      message: `Lấy được ${finalQuestions.length}/${summary.requested} câu hỏi`,
      data: {
        questions: finalQuestions,
        summary,
        warnings: warnings.length > 0 ? warnings : undefined
      }
    });
  } catch (error) {
    console.error('GetRandomQuestions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi lấy câu hỏi random'
    });
  }
};

const balanceByTopic = (questions, targetCount, topicDistribution) => {
  const result = [];
  const questionsByTopic = {};

  questions.forEach(q => {
    if (!questionsByTopic[q.topic]) {
      questionsByTopic[q.topic] = [];
    }
    questionsByTopic[q.topic].push(q);
  });

  const topics = Object.keys(questionsByTopic);
  if (topics.length === 0) return result;

  const topicQuota = {};
  let totalConfigured = 0;

  if (topicDistribution && Object.keys(topicDistribution).length > 0) {
    for (const [topic, quota] of Object.entries(topicDistribution)) {
      if (questionsByTopic[topic]) {
        topicQuota[topic] = Math.min(quota, questionsByTopic[topic].length);
        totalConfigured += topicQuota[topic];
      }
    }
  }

  const remaining = targetCount - totalConfigured;
  const unconfiguredTopics = topics.filter(t => !topicQuota[t]);

  if (remaining > 0 && unconfiguredTopics.length > 0) {
    const perTopic = Math.floor(remaining / unconfiguredTopics.length);
    unconfiguredTopics.forEach(topic => {
      topicQuota[topic] = Math.min(perTopic, questionsByTopic[topic].length);
    });
  }

  for (const [topic, quota] of Object.entries(topicQuota)) {
    const shuffled = shuffleArray(questionsByTopic[topic]);
    result.push(...shuffled.slice(0, quota));
  }

  if (result.length < targetCount) {
    const usedIds = new Set(result.map(q => q.id));
    const remainingQuestions = questions.filter(q => !usedIds.has(q.id));
    const shuffledRemaining = shuffleArray(remainingQuestions);
    result.push(...shuffledRemaining.slice(0, targetCount - result.length));
  }

  return result.slice(0, targetCount);
};

// @desc    Get available questions count by criteria
// @route   GET /api/questions/random/available
// @access  Teacher/Admin
const getAvailableQuestionsCount = async (req, res) => {
  try {
    const { subjectId } = req.query;

    if (!subjectId) {
      return res.status(400).json({
        status: 'error',
        message: 'Vui lòng cung cấp subjectId'
      });
    }

    const questions = await prisma.question.findMany({
      where: {
        subjectId: parseInt(subjectId),
        status: 'approved'
      },
      select: {
        bloomLevel: true,
        questionType: true,
        topic: true
      }
    });

    const stats = {
      total: questions.length,
      byBloomLevel: {},
      byQuestionType: {},
      byTopic: {},
      detailed: {}
    };

    questions.forEach(q => {
      stats.byBloomLevel[q.bloomLevel] = (stats.byBloomLevel[q.bloomLevel] || 0) + 1;
      stats.byQuestionType[q.questionType] = (stats.byQuestionType[q.questionType] || 0) + 1;
      stats.byTopic[q.topic] = (stats.byTopic[q.topic] || 0) + 1;

      const key = `${q.bloomLevel}_${q.questionType}`;
      stats.detailed[key] = (stats.detailed[key] || 0) + 1;
    });

    res.json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    console.error('GetAvailableCount error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server'
    });
  }
};

module.exports = {
  getRandomQuestions,
  getAvailableQuestionsCount
};
