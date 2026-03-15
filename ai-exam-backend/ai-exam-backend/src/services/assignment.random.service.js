const prisma = require('../config/prisma');

const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Sinh câu hỏi ngẫu nhiên theo cấu hình (dùng cho assignment type random_config)
 * @param {Object} config - { subjectId, topicId?, topicCode?, totalQuestions, distribution?, topicDistribution? }
 * @returns {Promise<{id, orderNumber}[]>} - Danh sách question id + thứ tự
 */
const generateRandomQuestionsByConfig = async (config) => {
  const {
    subjectId,
    topicId,
    topicCode,
    totalQuestions = 40,
    distribution,
    topicDistribution
  } = config || {};

  let topicFilter = topicCode;
  if (topicId && !topicCode) {
    const topic = await prisma.topic.findFirst({
      where: { id: parseInt(topicId), subjectId: parseInt(subjectId) }
    });
    if (topic) topicFilter = topic.code;
  }

  const where = {
    subjectId: parseInt(subjectId),
    status: 'approved'
  };
  if (topicFilter) {
    where.topic = topicFilter;
  }

  const allQuestions = await prisma.question.findMany({
    where,
    select: {
      id: true,
      bloomLevel: true,
      questionType: true,
      topic: true
    }
  });

  if (allQuestions.length === 0) {
    return [];
  }

  const defaultDist = {
    nhan_biet: { count: Math.floor(totalQuestions * 0.3), trac_nghiem: null, tu_luan: 0 },
    thong_hieu: { count: Math.floor(totalQuestions * 0.3), trac_nghiem: null, tu_luan: 0 },
    van_dung: { count: Math.floor(totalQuestions * 0.25), trac_nghiem: null, tu_luan: 0 },
    van_dung_cao: { count: Math.floor(totalQuestions * 0.15), trac_nghiem: null, tu_luan: 0 }
  };

  const dist = distribution || defaultDist;
  const grouped = {};

  allQuestions.forEach(q => {
    const key = `${q.bloomLevel}_${q.questionType}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(q);
  });

  const selected = [];

  for (const [bloomLevel, cfg] of Object.entries(dist)) {
    const { count, trac_nghiem, tu_luan = 0 } = cfg || {};
    if (!count || count <= 0) continue;

    const tracNghiemCount = trac_nghiem !== null ? trac_nghiem : count - (tu_luan || 0);
    const tuLuanCount = tu_luan || 0;

    for (const [type, typeCount] of [['trac_nghiem', tracNghiemCount], ['tu_luan', tuLuanCount]]) {
      if (typeCount <= 0) continue;
      const key = `${bloomLevel}_${type}`;
      const available = (grouped[key] || []).filter(
        q => !selected.find(s => s.id === q.id)
      );
      const shuffled = shuffleArray(available);
      selected.push(...shuffled.slice(0, typeCount));
    }
  }

  return shuffleArray(selected).map((q, idx) => ({
    id: q.id,
    orderNumber: idx + 1
  }));
};

module.exports = { generateRandomQuestionsByConfig };
