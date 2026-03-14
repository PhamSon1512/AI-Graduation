const { getGroqClient, MODELS, BLOOM_LEVELS, PHYSICS_12_TOPICS } = require('../config/ai.config');
const prisma = require('../config/prisma');

// ==================== PROMPTS ====================

const EXPLAIN_QUESTION_PROMPT = `Bạn là gia sư Vật Lý 12 giỏi, nhiệt tình. Hãy giải thích câu hỏi sau cho học sinh hiểu.

Câu hỏi: {question}
Các đáp án:
A. {optionA}
B. {optionB}
C. {optionC}
D. {optionD}
Đáp án đúng: {correctAnswer}

Yêu cầu:
1. Giải thích ngắn gọn, dễ hiểu
2. Chỉ ra tại sao đáp án đúng là đúng
3. Giải thích tại sao các đáp án sai là sai
4. Sử dụng LaTeX cho công thức (ví dụ: $E = mc^2$)
5. Trả về HTML format với các tag <p>, <strong>, <em>`;

const STEP_SOLUTION_PROMPT = `Bạn là gia sư Vật Lý 12 giỏi. Hãy giải chi tiết TỪNG BƯỚC câu hỏi sau.

Câu hỏi: {question}
Các đáp án:
A. {optionA}
B. {optionB}
C. {optionC}
D. {optionD}

Yêu cầu:
1. Giải từng bước rõ ràng, đánh số bước
2. Mỗi bước giải thích lý do
3. Cuối cùng đưa ra đáp án
4. Sử dụng LaTeX cho công thức
5. Trả về HTML format

Ví dụ format:
<div class="step">
  <strong>Bước 1: Xác định dữ kiện</strong>
  <p>Từ đề bài ta có...</p>
</div>`;

const GENERATE_QUESTION_PROMPT = `Bạn là chuyên gia soạn đề thi Vật Lý 12. Hãy tạo {count} câu hỏi trắc nghiệm.

YÊU CẦU:
- Môn học: {subject}
- Chủ đề (topic): {topic}
- Mức độ Bloom: {bloomLevel}
- Loại câu hỏi: {questionType}

HƯỚNG DẪN MỨC ĐỘ BLOOM:
- nhan_biet: Câu hỏi nhớ công thức, định nghĩa, khái niệm cơ bản
- thong_hieu: Câu hỏi giải thích, so sánh, suy luận đơn giản
- van_dung: Bài tập tính toán cơ bản, áp dụng công thức
- van_dung_cao: Bài tập phức tạp, nhiều bước, kết hợp kiến thức

QUAN TRỌNG VỀ FORMAT:
- Trả về ĐÚNG JSON format, không thêm markdown hay text khác
- Với công thức toán/vật lý: dùng ký hiệu Unicode thay vì LaTeX (ví dụ: ω thay vì \\omega, π thay vì \\pi, √ thay vì \\sqrt)
- Hoặc viết công thức đơn giản: v = omega*A, E = mc^2
- KHÔNG dùng ký tự đặc biệt trong JSON

TRẢ VỀ JSON:
{
  "questions": [
    {
      "content_html": "Nội dung câu hỏi (ví dụ: Cho con lắc có tần số góc ω = 2π rad/s)",
      "options": {
        "A": "Đáp án A",
        "B": "Đáp án B", 
        "C": "Đáp án C",
        "D": "Đáp án D"
      },
      "correct_answer": "A",
      "explanation_html": "Lời giải chi tiết",
      "topic": "{topic}",
      "bloom_level": "{bloomLevel}"
    }
  ]
}`;

const ANALYZE_EXAM_REQUEST_PROMPT = `Bạn là chuyên gia phân tích yêu cầu đề thi. Hãy phân tích yêu cầu sau và trả về cấu trúc đề thi.

YÊU CẦU CỦA GIÁO VIÊN: "{teacherRequest}"

THÔNG TIN HỆ THỐNG:
- Môn học có sẵn: {availableSubjects}
- Topics có sẵn: {availableTopics}
- Số câu hỏi trong ngân hàng: {questionBankStats}

PHÂN TÍCH VÀ TRẢ VỀ JSON:
{
  "exam_title": "Tiêu đề đề thi phù hợp",
  "subject_id": ID môn học phù hợp nhất,
  "total_questions": số câu hỏi (mặc định 40-50),
  "duration_minutes": thời gian làm bài (mặc định 60-90),
  "distribution": {
    "by_bloom_level": {
      "nhan_biet": { "count": X, "percent": Y },
      "thong_hieu": { "count": X, "percent": Y },
      "van_dung": { "count": X, "percent": Y },
      "van_dung_cao": { "count": X, "percent": Y }
    },
    "by_topic": {
      "topic_name": { "count": X, "bloom_breakdown": { "nhan_biet": A, "thong_hieu": B, ... } }
    }
  },
  "special_requirements": ["yêu cầu đặc biệt nếu có"],
  "reasoning": "Giải thích lý do phân bổ như vậy"
}

LƯU Ý:
- Đề thi tốt nghiệp THPT thường: 30% nhận biết, 30% thông hiểu, 30% vận dụng, 10% vận dụng cao
- Phân bổ đều các topic, không quá nhiều câu về 1 chủ đề
- Số câu mỗi topic nên từ 3-8 câu`;

const GENERATE_NEW_QUESTIONS_PROMPT = `Bạn là chuyên gia soạn đề thi {subject}. Hãy tạo {count} câu hỏi MỚI, SÁNG TẠO.

THAM KHẢO CÂU HỎI CÓ SẴN (để tạo câu tương tự nhưng KHÁC):
{sampleQuestions}

YÊU CẦU:
- Topic: {topic}
- Mức độ Bloom: {bloomLevel}
- Loại: trắc nghiệm 4 đáp án
- KHÔNG sao chép câu mẫu, chỉ tham khảo style

TRẢ VỀ JSON:
{
  "questions": [
    {
      "content_html": "Nội dung câu hỏi mới",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correct_answer": "A/B/C/D",
      "explanation_html": "Lời giải",
      "topic": "{topic}",
      "bloom_level": "{bloomLevel}",
      "is_ai_generated": true
    }
  ]
}`;

// ==================== HELPER FUNCTIONS ====================

const parseJsonResponse = (text) => {
  let jsonStr = text;
  
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  } else {
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }
  }

  if (!jsonStr || !jsonStr.trim()) {
    throw new Error('Không tìm thấy JSON trong response');
  }

  const cleanJson = (str) => {
    return str
      .replace(/\\(?!["\\/bfnrtu])/g, '\\\\')
      .replace(/[\x00-\x1F\x7F]/g, (char) => {
        if (char === '\n') return '\\n';
        if (char === '\r') return '\\r';
        if (char === '\t') return '\\t';
        return '';
      })
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
      .replace(/:\s*'([^']*)'/g, ': "$1"');
  };

  const attempts = [
    () => JSON.parse(jsonStr),
    () => JSON.parse(cleanJson(jsonStr)),
    () => {
      const strictClean = jsonStr
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, '')
        .replace(/\\t/g, ' ')
        .replace(/\\/g, '\\\\')
        .replace(/\\\\\\\\/g, '\\\\');
      return JSON.parse(strictClean);
    },
    () => {
      const lines = jsonStr.split('\n');
      const filtered = lines.filter(line => !line.trim().startsWith('//')).join('\n');
      return JSON.parse(cleanJson(filtered));
    }
  ];

  for (let i = 0; i < attempts.length; i++) {
    try {
      return attempts[i]();
    } catch (e) {
      if (i === attempts.length - 1) {
        console.error('JSON Parse Error - Raw response:', jsonStr.substring(0, 500));
        console.error('Parse error:', e.message);
        throw new Error(`Không thể parse JSON: ${e.message}`);
      }
    }
  }
};

const callGroqChat = async (prompt, maxTokens = 4000) => {
  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: MODELS.groq.text,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: maxTokens
  });
  return completion.choices[0]?.message?.content || '';
};

// ==================== AI TUTOR FUNCTIONS ====================

const explainQuestion = async (question) => {
  const prompt = EXPLAIN_QUESTION_PROMPT
    .replace('{question}', question.contentHtml || question.content_html)
    .replace('{optionA}', question.options?.A || '')
    .replace('{optionB}', question.options?.B || '')
    .replace('{optionC}', question.options?.C || '')
    .replace('{optionD}', question.options?.D || '')
    .replace('{correctAnswer}', question.correctAnswer || question.correct_answer || '');

  const response = await callGroqChat(prompt, 2000);
  return response;
};

const getStepSolution = async (question) => {
  const prompt = STEP_SOLUTION_PROMPT
    .replace('{question}', question.contentHtml || question.content_html)
    .replace('{optionA}', question.options?.A || '')
    .replace('{optionB}', question.options?.B || '')
    .replace('{optionC}', question.options?.C || '')
    .replace('{optionD}', question.options?.D || '');

  const response = await callGroqChat(prompt, 3000);
  return response;
};

// ==================== AI QUESTION GENERATOR FUNCTIONS ====================

const generateQuestions = async ({ subjectId, topic, bloomLevel, questionType = 'trac_nghiem', count = 5 }) => {
  const subject = await prisma.subject.findUnique({
    where: { id: parseInt(subjectId) }
  });

  if (!subject) {
    throw new Error('Không tìm thấy môn học');
  }

  const prompt = GENERATE_QUESTION_PROMPT
    .replace('{count}', count)
    .replace('{subject}', subject.name)
    .replace('{topic}', topic)
    .replace(/{bloomLevel}/g, bloomLevel)
    .replace('{questionType}', questionType === 'tu_luan' ? 'tự luận ngắn' : 'trắc nghiệm 4 đáp án');

  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Generate questions attempt ${attempt}/${maxRetries}...`);
      
      const response = await callGroqChat(prompt, 6000);
      const parsed = parseJsonResponse(response);

      if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        throw new Error('AI không trả về câu hỏi hợp lệ');
      }

      return {
        questions: parsed.questions.map((q, idx) => ({
          ...q,
          subject_id: subjectId,
          subject_name: subject.name,
          order_number: idx + 1,
          is_ai_generated: true
        })),
        subject: { id: subject.id, name: subject.name }
      };
    } catch (error) {
      lastError = error;
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw new Error(`Không thể sinh câu hỏi sau ${maxRetries} lần thử: ${lastError?.message}`);
};

// ==================== AI EXAM GENERATOR FUNCTIONS ====================

const analyzeExamRequest = async (teacherRequest, subjectId = null) => {
  const subjects = await prisma.subject.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true, topics: true }
  });

  const questionStats = await prisma.question.groupBy({
    by: ['subjectId', 'topic', 'bloomLevel'],
    where: { status: 'approved' },
    _count: true
  });

  const statsString = questionStats
    .slice(0, 20)
    .map(s => `Subject ${s.subjectId}: ${s.topic} - ${s.bloomLevel}: ${s._count} câu`)
    .join('\n');

  const prompt = ANALYZE_EXAM_REQUEST_PROMPT
    .replace('{teacherRequest}', teacherRequest)
    .replace('{availableSubjects}', subjects.map(s => `${s.id}: ${s.name}`).join(', '))
    .replace('{availableTopics}', PHYSICS_12_TOPICS.join(', '))
    .replace('{questionBankStats}', statsString || 'Chưa có câu hỏi');

  const response = await callGroqChat(prompt, 3000);
  return parseJsonResponse(response);
};

const generateExam = async (teacherRequest, userId) => {
  console.log('🤖 Analyzing teacher request...');
  const examStructure = await analyzeExamRequest(teacherRequest);
  
  console.log('📊 Exam structure:', JSON.stringify(examStructure, null, 2));

  const subjectId = examStructure.subject_id || 1;
  const totalQuestions = examStructure.total_questions || 40;
  
  const existingQuestions = await prisma.question.findMany({
    where: {
      subjectId: parseInt(subjectId),
      status: 'approved'
    },
    select: {
      id: true,
      contentHtml: true,
      options: true,
      topic: true,
      bloomLevel: true,
      correctAnswer: true,
      explanationHtml: true
    }
  });

  console.log(`📚 Found ${existingQuestions.length} existing questions in bank`);

  const selectedQuestions = [];
  const aiGeneratedQuestions = [];
  const distribution = examStructure.distribution?.by_bloom_level || {
    nhan_biet: { count: Math.floor(totalQuestions * 0.3) },
    thong_hieu: { count: Math.floor(totalQuestions * 0.3) },
    van_dung: { count: Math.floor(totalQuestions * 0.3) },
    van_dung_cao: { count: Math.floor(totalQuestions * 0.1) }
  };

  for (const [bloomLevel, config] of Object.entries(distribution)) {
    const needed = config.count || 0;
    if (needed <= 0) continue;

    const availableForBloom = existingQuestions.filter(
      q => q.bloomLevel === bloomLevel && !selectedQuestions.find(sq => sq.id === q.id)
    );

    const shuffled = [...availableForBloom].sort(() => Math.random() - 0.5);
    const fromBank = shuffled.slice(0, Math.min(needed, shuffled.length));
    
    selectedQuestions.push(...fromBank.map(q => ({
      ...q,
      source: 'bank',
      bloom_level: q.bloomLevel,
      content_html: q.contentHtml,
      correct_answer: q.correctAnswer,
      explanation_html: q.explanationHtml
    })));

    const remaining = needed - fromBank.length;
    if (remaining > 0) {
      console.log(`🔄 Generating ${remaining} new questions for ${bloomLevel}...`);
      
      try {
        const sampleQuestions = fromBank.slice(0, 3).map(q => 
          `- ${q.contentHtml?.substring(0, 100)}...`
        ).join('\n');

        const subject = await prisma.subject.findUnique({
          where: { id: parseInt(subjectId) }
        });

        const prompt = GENERATE_NEW_QUESTIONS_PROMPT
          .replace('{subject}', subject?.name || 'Vật Lý 12')
          .replace('{count}', remaining)
          .replace('{sampleQuestions}', sampleQuestions || 'Không có mẫu')
          .replace(/{topic}/g, examStructure.distribution?.by_topic ? Object.keys(examStructure.distribution.by_topic)[0] : 'general')
          .replace(/{bloomLevel}/g, bloomLevel);

        const response = await callGroqChat(prompt, 5000);
        const parsed = parseJsonResponse(response);

        if (parsed.questions) {
          aiGeneratedQuestions.push(...parsed.questions.map(q => ({
            ...q,
            source: 'ai_generated',
            bloom_level: bloomLevel
          })));
        }
      } catch (error) {
        console.error(`❌ Failed to generate questions for ${bloomLevel}:`, error.message);
      }
    }
  }

  const allQuestions = [...selectedQuestions, ...aiGeneratedQuestions]
    .sort(() => Math.random() - 0.5)
    .map((q, idx) => ({
      ...q,
      order_number: idx + 1
    }));

  const summary = {
    total: allQuestions.length,
    from_bank: selectedQuestions.length,
    ai_generated: aiGeneratedQuestions.length,
    by_bloom_level: {},
    by_source: {
      bank: selectedQuestions.length,
      ai: aiGeneratedQuestions.length
    }
  };

  allQuestions.forEach(q => {
    const bl = q.bloom_level || q.bloomLevel;
    summary.by_bloom_level[bl] = (summary.by_bloom_level[bl] || 0) + 1;
  });

  return {
    exam: {
      title: examStructure.exam_title || 'Đề thi được tạo bởi AI',
      subject_id: subjectId,
      total_questions: allQuestions.length,
      duration_minutes: examStructure.duration_minutes || 60,
      ai_reasoning: examStructure.reasoning
    },
    questions: allQuestions,
    summary,
    structure: examStructure
  };
};

module.exports = {
  explainQuestion,
  getStepSolution,
  generateQuestions,
  generateExam,
  analyzeExamRequest
};
