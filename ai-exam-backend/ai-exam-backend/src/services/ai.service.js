const {
  AI_PROVIDER,
  getGeminiModel,
  getGroqClient,
  PHYSICS_12_TOPICS,
  BLOOM_LEVELS
} = require('../config/ai.config');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const OCR_EXAM_PROMPT = `Bạn là chuyên gia OCR đề thi Vật Lý 12. Hãy trích xuất TẤT CẢ câu hỏi trắc nghiệm từ nội dung này.

QUAN TRỌNG: Trả về ĐÚNG định dạng JSON sau, không thêm bất kỳ text nào khác:

{
  "questions": [
    {
      "content_html": "Nội dung câu hỏi (giữ nguyên công thức, dùng LaTeX cho công thức toán: $v = \\\\omega A$)",
      "options": {
        "A": "Nội dung đáp án A",
        "B": "Nội dung đáp án B",
        "C": "Nội dung đáp án C",
        "D": "Nội dung đáp án D"
      },
      "correct_answer": "A hoặc B hoặc C hoặc D (nếu nhìn thấy đáp án đúng, không thì để null)",
      "topic": "một trong: ${PHYSICS_12_TOPICS.join(', ')}",
      "bloom_level": "một trong: ${BLOOM_LEVELS.join(', ')}",
      "explanation_html": "Lời giải nếu có trong ảnh, không có thì để null"
    }
  ],
  "metadata": {
    "total_questions": "số câu hỏi tìm được",
    "exam_title": "tiêu đề đề thi nếu có",
    "subject": "Vật Lý 12"
  }
}

Hướng dẫn xác định topic:
- dao_dong_co: Con lắc đơn, con lắc lò xo, dao động điều hòa, chu kỳ, tần số
- song_co: Sóng cơ, giao thoa sóng, sóng dừng, sóng âm
- dien_xoay_chieu: Mạch RLC, điện xoay chiều, công suất, hệ số công suất
- song_anh_sang: Giao thoa ánh sáng, tán sắc, quang phổ
- luong_tu_anh_sang: Hiện tượng quang điện, lưỡng tính sóng hạt
- vat_ly_hat_nhan: Phóng xạ, phản ứng hạt nhân, năng lượng liên kết

Hướng dẫn xác định bloom_level:
- nhan_biet: Câu hỏi nhớ công thức, định nghĩa đơn giản
- thong_hieu: Câu hỏi giải thích, so sánh
- van_dung: Bài tập tính toán cơ bản
- van_dung_cao: Bài tập phức tạp, nhiều bước, kết hợp kiến thức`;

const extractTextFromPdf = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF Parse Error:', error);
    throw new Error('Không thể đọc file PDF');
  }
};

const extractTextFromWord = async (buffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Word Parse Error:', error);
    throw new Error('Không thể đọc file Word');
  }
};

const ocrWithGemini = async (fileBuffer, mimeType) => {
  const model = getGeminiModel('vision');
  let content = [];

  if (mimeType === 'application/pdf') {
    const text = await extractTextFromPdf(fileBuffer);
    content = [OCR_EXAM_PROMPT + '\n\nNội dung đề thi:\n' + text];
  } else if (mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const text = await extractTextFromWord(fileBuffer);
    content = [OCR_EXAM_PROMPT + '\n\nNội dung đề thi:\n' + text];
  } else {
    const imagePart = {
      inlineData: {
        data: fileBuffer.toString('base64'),
        mimeType: mimeType
      }
    };
    content = [OCR_EXAM_PROMPT, imagePart];
  }

  const result = await model.generateContent(content);
  const response = await result.response;
  return response.text();
};

const ocrWithGroq = async (fileBuffer, mimeType) => {
  const groq = getGroqClient();

  let messages = [];

  if (mimeType === 'application/pdf') {
    const text = await extractTextFromPdf(fileBuffer);
    messages = [
      {
        role: 'user',
        content: OCR_EXAM_PROMPT + '\n\nNội dung đề thi:\n' + text
      }
    ];
  } else if (mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const text = await extractTextFromWord(fileBuffer);
    messages = [
      {
        role: 'user',
        content: OCR_EXAM_PROMPT + '\n\nNội dung đề thi:\n' + text
      }
    ];
  } else {
    const base64Image = fileBuffer.toString('base64');
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: OCR_EXAM_PROMPT
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl
            }
          }
        ]
      }
    ];
  }

  const completion = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: messages,
    temperature: 0.1,
    max_tokens: 8000
  });

  return completion.choices[0]?.message?.content || '';
};

const parseOcrResponse = (text) => {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Không thể parse JSON từ response của AI');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  if (parsed.questions) {
    parsed.questions = parsed.questions.map(q => ({
      ...q,
      topic: PHYSICS_12_TOPICS.includes(q.topic) ? q.topic : 'dao_dong_co',
      bloom_level: BLOOM_LEVELS.includes(q.bloom_level) ? q.bloom_level : 'nhan_biet',
      correct_answer: ['A', 'B', 'C', 'D'].includes(q.correct_answer) ? q.correct_answer : null
    }));
  }

  return parsed;
};

const ocrExamImage = async (fileBuffer, mimeType = 'image/png') => {
  try {
    let responseText;

    if (AI_PROVIDER === 'groq') {
      console.log('🔄 Using Groq for OCR...');
      responseText = await ocrWithGroq(fileBuffer, mimeType);
    } else {
      console.log('🔄 Using Gemini for OCR...');
      responseText = await ocrWithGemini(fileBuffer, mimeType);
    }

    return parseOcrResponse(responseText);
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error(`Lỗi OCR: ${error.message}`);
  }
};

const ocrMultipleFiles = async (files) => {
  const results = {
    questions: [],
    metadata: {
      total_questions: 0,
      files_processed: 0,
      errors: [],
      provider: AI_PROVIDER
    }
  };

  for (const file of files) {
    try {
      const fileResult = await ocrExamImage(file.buffer, file.mimetype);

      if (fileResult.questions && Array.isArray(fileResult.questions)) {
        results.questions.push(...fileResult.questions);
      }

      results.metadata.files_processed++;
    } catch (error) {
      results.metadata.errors.push({
        filename: file.originalname,
        error: error.message
      });
    }
  }

  results.metadata.total_questions = results.questions.length;

  return results;
};

const generateExplanation = async (question, correctAnswer) => {
  try {
    const prompt = `Bạn là giáo viên Vật Lý 12 giỏi. Hãy giải thích chi tiết câu hỏi sau:

Câu hỏi: ${question.content_html}
A. ${question.options?.A || ''}
B. ${question.options?.B || ''}
C. ${question.options?.C || ''}
D. ${question.options?.D || ''}

Đáp án đúng: ${correctAnswer}

Hãy viết lời giải chi tiết bằng tiếng Việt, sử dụng LaTeX cho công thức (ví dụ: $E = mc^2$).
Trả về HTML format với các tag <p>, <strong>, <em> phù hợp.`;

    if (AI_PROVIDER === 'groq') {
      const groq = getGroqClient();
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      });
      return completion.choices[0]?.message?.content || '';
    } else {
      const model = getGeminiModel('text');
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    }
  } catch (error) {
    console.error('Generate Explanation Error:', error);
    throw new Error(`Lỗi tạo lời giải: ${error.message}`);
  }
};

const analyzeQuestionDifficulty = async (questionContent) => {
  try {
    const prompt = `Phân tích câu hỏi Vật Lý 12 sau và xác định mức độ Bloom:

${questionContent}

Trả về JSON:
{
  "bloom_level": "nhan_biet | thong_hieu | van_dung | van_dung_cao",
  "reasoning": "Lý do chọn mức độ này"
}`;

    let responseText;

    if (AI_PROVIDER === 'groq') {
      const groq = getGroqClient();
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500
      });
      responseText = completion.choices[0]?.message?.content || '';
    } else {
      const model = getGeminiModel('text');
      const result = await model.generateContent(prompt);
      const response = await result.response;
      responseText = response.text();
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { bloom_level: 'thong_hieu', reasoning: 'Mặc định' };
  } catch (error) {
    console.error('Analyze Difficulty Error:', error);
    return { bloom_level: 'thong_hieu', reasoning: 'Lỗi phân tích' };
  }
};

module.exports = {
  ocrExamImage,
  ocrMultipleFiles,
  extractTextFromPdf,
  extractTextFromWord,
  generateExplanation,
  analyzeQuestionDifficulty,
  PHYSICS_12_TOPICS,
  BLOOM_LEVELS,
  AI_PROVIDER
};
