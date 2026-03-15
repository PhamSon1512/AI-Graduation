const {
  AI_PROVIDER,
  getGeminiModel,
  getGroqClient,
  PHYSICS_12_TOPICS,
  BLOOM_LEVELS,
  MODELS
} = require('../config/ai.config');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const OCR_EXAM_PROMPT = `Bạn là chuyên gia OCR đề thi. Hãy trích xuất TẤT CẢ câu hỏi từ nội dung này.

QUAN TRỌNG VỀ HÌNH ẢNH:
- Nếu câu hỏi có hình ảnh (biển báo, sơ đồ, đồ thị, hình vẽ), hãy MÔ TẢ CHI TIẾT hình ảnh đó
- Đặt has_image: true và điền image_description
- Mô tả từng đáp án hình ảnh nếu đáp án là hình

VÍ DỤ cho câu hỏi có hình biển báo:
{
  "content_html": "Biển báo nào dưới đây cảnh báo khu vực có chất phóng xạ?",
  "has_image": true,
  "image_description": "Câu hỏi có 4 biển báo hình tam giác: A-biển có hình tia sét (nguy hiểm điện), B-biển có ký hiệu phóng xạ 3 cánh quạt, C-biển có ký hiệu sinh học nguy hiểm, D-biển có dấu chấm than",
  "options": {
    "A": "Biển hình tam giác vàng có hình tia sét (cảnh báo điện cao áp)",
    "B": "Biển hình tam giác vàng có ký hiệu phóng xạ (☢) 3 cánh quạt",
    "C": "Biển hình tam giác vàng có ký hiệu sinh học nguy hiểm (☣)",
    "D": "Biển hình tam giác vàng có dấu chấm than cảnh báo chung"
  },
  "correct_answer": "B"
}

ĐỊNH DẠNG JSON TRẢ VỀ (KHÔNG thêm text khác):

{
  "questions": [
    {
      "content_html": "Nội dung câu hỏi (dùng LaTeX cho công thức: $v = \\\\omega A$)",
      "has_image": true/false,
      "image_description": "Mô tả chi tiết hình ảnh nếu có, null nếu không",
      "question_type": "trac_nghiem hoặc tu_luan",
      "options": {
        "A": "Đáp án A (mô tả hình nếu đáp án là hình)",
        "B": "Đáp án B",
        "C": "Đáp án C",
        "D": "Đáp án D"
      },
      "correct_answer": "QUAN TRỌNG: Chỉ điền A/B/C/D cho câu TRẮC NGHIỆM khi thấy đáp án trong đề. Với câu TỰ LUẬN (tu_luan) luôn để null vì AI không đảm bảo đáp án đúng cho tự luận.",
      "topic": "một trong: ${PHYSICS_12_TOPICS.join(', ')}",
      "bloom_level": "một trong: ${BLOOM_LEVELS.join(', ')}",
      "explanation_html": "Lời giải nếu có, null nếu không"
    }
  ],
  "metadata": {
    "total_questions": số_câu_hỏi,
    "exam_title": "tiêu đề đề thi nếu có",
    "has_images": true/false,
    "subject": "Vật Lý 12"
  }
}

Hướng dẫn xác định topic:
- dao_dong_co: Con lắc, dao động điều hòa, chu kỳ, tần số
- song_co: Sóng cơ, giao thoa sóng, sóng dừng, sóng âm
- dien_xoay_chieu: Mạch RLC, điện xoay chiều, công suất
- song_anh_sang: Giao thoa ánh sáng, tán sắc, quang phổ
- luong_tu_anh_sang: Hiện tượng quang điện, lưỡng tính sóng hạt
- vat_ly_hat_nhan: Phóng xạ, phản ứng hạt nhân, năng lượng liên kết
- nhiet_hoc: Nhiệt động lực học, khí lý tưởng
- dien_tu_truong: Sóng điện từ, điện trường, từ trường

Hướng dẫn xác định bloom_level:
- nhan_biet: Nhớ công thức, định nghĩa đơn giản
- thong_hieu: Giải thích, so sánh
- van_dung: Bài tập tính toán cơ bản
- van_dung_cao: Bài tập phức tạp, nhiều bước`;

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
    model: MODELS.groq.vision,
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
    parsed.questions = parsed.questions.map((q, index) => {
      const isTuLuan = q.question_type === 'tu_luan';
      const correctAnswer = isTuLuan
        ? null
        : (q.correct_answer ? String(q.correct_answer).toUpperCase() : null);
      return {
        ...q,
        order_number: index + 1,
        topic: PHYSICS_12_TOPICS.includes(q.topic) ? q.topic : 'dao_dong_co',
        bloom_level: BLOOM_LEVELS.includes(q.bloom_level) ? q.bloom_level : 'nhan_biet',
        question_type: isTuLuan ? 'tu_luan' : 'trac_nghiem',
        correct_answer: correctAnswer,
        has_image: q.has_image || false,
        image_description: q.image_description || null
      };
    });
  }

  return parsed;
};

const isImageFile = (mimeType) => {
  return mimeType.startsWith('image/');
};

const ocrExamImage = async (fileBuffer, mimeType = 'image/png') => {
  const useGeminiForImages = true;
  
  try {
    let responseText;

    if (isImageFile(mimeType) && useGeminiForImages) {
      console.log('🖼️ Image detected → Trying Gemini Vision...');
      try {
        responseText = await ocrWithGemini(fileBuffer, mimeType);
      } catch (geminiError) {
        console.error('❌ Gemini failed:', geminiError.message);
        console.log('🔄 Falling back to Groq Vision...');
        responseText = await ocrWithGroq(fileBuffer, mimeType);
      }
    } else if (isImageFile(mimeType)) {
      console.log('🖼️ Image detected → Using Groq Vision...');
      responseText = await ocrWithGroq(fileBuffer, mimeType);
    } else {
      console.log('📄 Document detected → Using Groq...');
      responseText = await ocrWithGroq(fileBuffer, mimeType);
    }

    return parseOcrResponse(responseText);
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error(`Lỗi OCR: ${error.message}`);
  }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const { uploadImage, isCloudinaryConfigured } = require('../config/cloudinary.config');

const uploadPageImage = async (fileBuffer, filename) => {
  if (!isCloudinaryConfigured()) {
    console.log('⚠️ Cloudinary not configured, skipping image upload');
    return null;
  }
  
  try {
    const result = await uploadImage(fileBuffer, {
      folder: 'ai-exam/exam-pages',
      public_id: `page_${Date.now()}_${filename.replace(/\.[^/.]+$/, '')}`
    });
    console.log(`☁️ Uploaded to Cloudinary: ${result.url}`);
    return result.url;
  } catch (error) {
    console.error('❌ Cloudinary upload failed:', error.message);
    return null;
  }
};

const ocrMultipleFiles = async (files) => {
  const results = {
    questions: [],
    metadata: {
      total_questions: 0,
      files_processed: 0,
      errors: [],
      provider: AI_PROVIDER,
      page_images: []
    }
  };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (i > 0) {
      console.log(`⏳ Waiting 3 seconds before processing file ${i + 1}/${files.length} to avoid rate limit...`);
      await delay(3000);
    }
    
    console.log(`📄 Processing file ${i + 1}/${files.length}: ${file.originalname}`);
    
    try {
      let pageImageUrl = null;
      
      if (isImageFile(file.mimetype)) {
        pageImageUrl = await uploadPageImage(file.buffer, file.originalname);
      }
      
      results.metadata.page_images.push({
        page: i + 1,
        filename: file.originalname,
        url: pageImageUrl
      });
      
      const fileResult = await ocrExamImage(file.buffer, file.mimetype);

      if (fileResult.questions && Array.isArray(fileResult.questions)) {
        const questionsWithPage = fileResult.questions.map((q, idx) => ({
          ...q,
          page_number: i + 1,
          source_file: file.originalname,
          page_image_url: pageImageUrl
        }));
        results.questions.push(...questionsWithPage);
      }

      results.metadata.files_processed++;
      console.log(`✅ File ${i + 1} processed successfully`);
    } catch (error) {
      console.error(`❌ File ${i + 1} failed:`, error.message);
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

    const groq = getGroqClient();
    console.log('📝 Using Groq for text generation (explanation)...');
    const completion = await groq.chat.completions.create({
      model: MODELS.groq.text,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000
    });
    return completion.choices[0]?.message?.content || '';
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

    console.log('📊 Using Groq for text analysis (difficulty)...');
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: MODELS.groq.text,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 500
    });
    const responseText = completion.choices[0]?.message?.content || '';

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
