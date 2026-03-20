const {
  AI_PROVIDER,
  getGeminiModel,
  getGroqClient,
  isGeminiConfigured,
  PHYSICS_12_TOPICS,
  BLOOM_LEVELS,
  MODELS
} = require('../config/ai.config');
const { normalizeQuestionType } = require('../constants/questionTypes');
const { PDFParse } = require('pdf-parse');
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
      "question_type": "trac_nghiem_1_dap_an | trac_nghiem_nhieu_dap_an | trac_nghiem_dung_sai | trac_nghiem_tra_loi_ngan",
      "options": "Xem hướng dẫn từng loại bên dưới",
      "correct_answer": "Xem hướng dẫn từng loại bên dưới",
      "rounding_rule": "Chỉ dùng cho trac_nghiem_tra_loi_ngan: integer | 1_decimal | 2_decimals",
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
- van_dung_cao: Bài tập phức tạp, nhiều bước

CÁCH PHÂN BIỆT CÁC PHẦN TRONG ĐỀ THI THPT:

- "PHẦN I" hoặc "Câu trắc nghiệm nhiều phương án lựa chọn" → trac_nghiem_1_dap_an (chọn 1 trong A/B/C/D)
- "PHẦN II" hoặc "Câu trắc nghiệm đúng sai" → trac_nghiem_dung_sai (4 phát biểu a,b,c,d - mỗi cái Đúng/Sai)
- "PHẦN III" hoặc "Câu trắc nghiệm trả lời ngắn" → trac_nghiem_tra_loi_ngan (nhập số, có quy tắc làm tròn)
- "PHẦN IV" hoặc "Câu tự luận" hoặc không có options A/B/C/D → tu_luan (đáp án là text dài, giải thích)

HƯỚNG DẪN TỪNG LOẠI CÂU HỎI:

1. trac_nghiem_1_dap_an (PHẦN I - Câu trắc nghiệm 1 đáp án):
   - Nhận dạng: Có 4 đáp án A, B, C, D - chọn 1 đáp án đúng
   - options: { "A": "...", "B": "...", "C": "...", "D": "..." }
   - correct_answer: "A" hoặc "B" hoặc "C" hoặc "D"

2. trac_nghiem_dung_sai (PHẦN II - Câu đúng sai):
   - Nhận dạng: Có 4 phát biểu a), b), c), d) - xác định từng phát biểu ĐÚNG hay SAI
   - Có thể nhiều phát biểu đúng (VD: b và c đều đúng)
   - options: { "a": "nội dung phát biểu a", "b": "nội dung phát biểu b", "c": "nội dung phát biểu c", "d": "nội dung phát biểu d" }
   - correct_answer: PHẢI là object JSON: {"a":false,"b":true,"c":true,"d":false}
   - CHÚ Ý: KHÔNG được trả về dạng "B" hay "b" - phải trả về object JSON với 4 giá trị true/false

3. trac_nghiem_tra_loi_ngan (PHẦN III - Trả lời ngắn, nhập số):
   - Nhận dạng: Yêu cầu nhập số, thường có quy tắc làm tròn (số nguyên, 1-2 chữ số thập phân)
   - options: null
   - correct_answer: "42.5" (số đáp án, dạng string)
   - rounding_rule: "integer" | "1_decimal" | "2_decimals" (theo yêu cầu trong đề)

4. tu_luan (PHẦN IV - Câu tự luận):
   - Nhận dạng: Câu hỏi mở, yêu cầu giải thích/chứng minh/tính toán chi tiết, không có options A/B/C/D
   - options: null
   - correct_answer: "Nội dung đáp án/lời giải chi tiết..." (text dài)
   - Nếu đề không cho đáp án, correct_answer có thể để null hoặc gợi ý hướng giải

5. trac_nghiem_nhieu_dap_an (Bổ sung - nhiều đáp án đúng):
   - Nhận dạng: Có 4 đáp án A, B, C, D - chọn 1 HOẶC nhiều đáp án đúng
   - options: { "A": "...", "B": "...", "C": "...", "D": "..." }
   - correct_answer: "A,B,C" (các đáp án đúng cách nhau bởi dấu phẩy)

VÍ DỤ CÂU ĐÚNG SAI (PHẦN II):
Đề bài: "Hình bên mô phỏng thiết bị báo động nhiệt độ... Khi piston chạm vào vật M..."
- a) Áp suất khí trong xi lanh lúc còi bắt đầu... → SAI
- b) Nhiệt độ trong xi lanh khi còi bắt đầu phát ra âm thanh báo động là $87°C$ → ĐÚNG
- c) Ban đầu áp suất khí trong xi lanh là $1,1.10^5$ Pa → ĐÚNG
- d) Nhiệt độ trong xi lanh khi piston vừa tiếp xúc với vật nặng M là $47°C$ → SAI

Kết quả:
{
  "question_type": "trac_nghiem_dung_sai",
  "options": {
    "a": "Áp suất khí trong xi lanh lúc còi bắt đầu phát ra âm thanh báo động là $1,3.10^5$ Pa.",
    "b": "Nhiệt độ trong xi lanh khi còi bắt đầu phát ra âm thanh báo động là $87°C$.",
    "c": "Ban đầu áp suất khí trong xi lanh là $1,1.10^5$ Pa.",
    "d": "Nhiệt độ trong xi lanh khi piston vừa tiếp xúc với vật nặng M là $47°C$."
  },
  "correct_answer": {"a":false,"b":true,"c":true,"d":false}
}

VÍ DỤ CÂU TỰ LUẬN (PHẦN IV):
Đề bài: "Chứng minh rằng trong dao động điều hòa, gia tốc luôn hướng về vị trí cân bằng."
Kết quả:
{
  "question_type": "tu_luan",
  "options": null,
  "correct_answer": "Từ phương trình x = A.cos(ωt + φ), ta có: v = dx/dt = -Aω.sin(ωt + φ) và a = dv/dt = -Aω².cos(ωt + φ) = -ω²x. Vì ω² > 0 nên a và x luôn trái dấu, nghĩa là gia tốc luôn hướng về vị trí cân bằng (x = 0)."
}`;

/** Giới hạn độ dài text gửi LLM (tránh vượt context / timeout) */
const MAX_PDF_TEXT_CHARS = 120000;

const extractTextFromPdf = async (buffer) => {
  let parser;
  try {
    // pdf-parse v2+ exports PDFParse class; TypedArray tránh lỗi worker/một số môi trường
    const data = Buffer.isBuffer(buffer) ? new Uint8Array(buffer) : buffer;
    parser = new PDFParse({ data });
    const result = await parser.getText();
    let text = result?.text != null ? String(result.text).trim() : '';
    if (!text) {
      throw new Error(
        'PDF không trích xuất được chữ (thường gặp với file scan). Hãy upload ảnh từng trang hoặc PDF có lớp text.'
      );
    }
    if (text.length > MAX_PDF_TEXT_CHARS) {
      console.warn(`⚠️ PDF text truncated: ${text.length} → ${MAX_PDF_TEXT_CHARS} chars`);
      text =
        text.slice(0, MAX_PDF_TEXT_CHARS) +
        '\n\n[... phần sau đã bị cắt do giới hạn độ dài; có thể tách file hoặc upload ảnh trang ...]';
    }
    return text;
  } catch (error) {
    console.error('PDF Parse Error:', error);
    const msg = error?.message || 'Không thể đọc file PDF';
    throw new Error(msg);
  } finally {
    if (parser?.destroy) {
      try {
        await parser.destroy();
      } catch (_) {
        /* ignore */
      }
    }
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
  const isDocText =
    mimeType === 'application/pdf' ||
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const model = getGeminiModel(isDocText ? 'text' : 'vision');
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

  const isTextOnlyDoc =
    mimeType === 'application/pdf' ||
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const completion = await groq.chat.completions.create({
    model: isTextOnlyDoc ? MODELS.groq.text : MODELS.groq.vision,
    messages: messages,
    temperature: 0.1,
    max_tokens: isTextOnlyDoc ? 16000 : 8000
  });

  const content = completion?.choices?.[0]?.message?.content;
  if (!content || !String(content).trim()) {
    throw new Error('Groq không trả về nội dung. Thử lại hoặc kiểm tra model/API key.');
  }
  return String(content);
};

/**
 * Trích object JSON từ text AI — không dùng regex greedy \{[\s\S]*\} vì dễ sai khi trong chuỗi có dấu } (LaTeX).
 */
const extractJsonObjectFromAiText = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();

  if (s.startsWith('{')) {
    try {
      return JSON.parse(s);
    } catch (_) {
      /* thử cắt theo cặp ngoặc */
    }
  }

  const start = s.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\' && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          const chunk = s.slice(start, i + 1);
          try {
            return JSON.parse(chunk);
          } catch (e) {
            throw new Error(`JSON từ AI không hợp lệ: ${e.message}`);
          }
        }
      }
    }
  }
  return null;
};

const parseOcrResponse = (text) => {
  const parsed = extractJsonObjectFromAiText(text);
  if (!parsed) {
    throw new Error('Không thể parse JSON từ response của AI');
  }

  if (parsed.questions) {
    parsed.questions = parsed.questions.map((q, index) => {
      const qType = normalizeQuestionType(q.question_type);
      let correctAnswer = q.correct_answer;
      
      if (qType === 'trac_nghiem_1_dap_an' && correctAnswer) {
        correctAnswer = String(correctAnswer).toUpperCase().charAt(0);
      } else if (qType === 'trac_nghiem_nhieu_dap_an' && correctAnswer) {
        correctAnswer = String(correctAnswer).replace(/\s/g, '').toUpperCase();
      } else if (qType === 'trac_nghiem_dung_sai') {
        if (typeof correctAnswer === 'object' && correctAnswer !== null) {
          correctAnswer = JSON.stringify(correctAnswer);
        } else if (typeof correctAnswer === 'string') {
          try {
            const parsed = JSON.parse(correctAnswer);
            if (typeof parsed === 'object' && parsed !== null) {
              correctAnswer = JSON.stringify(parsed);
            }
          } catch {
            console.warn(`⚠️ Câu đúng sai có correct_answer không hợp lệ: "${correctAnswer}", tạo mặc định`);
            correctAnswer = JSON.stringify({ a: false, b: false, c: false, d: false });
          }
        } else {
          console.warn(`⚠️ Câu đúng sai thiếu correct_answer, tạo mặc định`);
          correctAnswer = JSON.stringify({ a: false, b: false, c: false, d: false });
        }
      } else if (qType === 'trac_nghiem_tra_loi_ngan' && correctAnswer) {
        correctAnswer = String(correctAnswer);
      }
      
      return {
        ...q,
        order_number: index + 1,
        topic: PHYSICS_12_TOPICS.includes(q.topic) ? q.topic : 'dao_dong_co',
        bloom_level: BLOOM_LEVELS.includes(q.bloom_level) ? q.bloom_level : 'nhan_biet',
        question_type: qType,
        correct_answer: correctAnswer,
        rounding_rule: q.rounding_rule || null,
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
      console.log('📄 Document detected → Gemini (nếu có) rồi Groq...');
      if (isGeminiConfigured()) {
        try {
          responseText = await ocrWithGemini(fileBuffer, mimeType);
        } catch (gemErr) {
          console.error('❌ Gemini document OCR failed:', gemErr.message);
          responseText = await ocrWithGroq(fileBuffer, mimeType);
        }
      } else {
        responseText = await ocrWithGroq(fileBuffer, mimeType);
      }
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
