const {
  AI_PROVIDER,
  getGeminiModel,
  getGroqClient,
  PHYSICS_12_TOPICS,
  BLOOM_LEVELS,
  MODELS
} = require('../config/ai.config');
const { normalizeQuestionType } = require('../constants/questionTypes');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');

const OCR_EXAM_PROMPT = `Bạn là chuyên gia OCR đề thi. Hãy trích xuất TẤT CẢ câu hỏi từ nội dung này.

NGUYÊN TẮC CHÍNH XÁC (ĐỌC TRƯỚC KHI LÀM):
Copy CHÍNH XÁC nội dung câu hỏi từ đề — không tóm tắt, không bỏ bớt, không thay đổi từ ngữ hay số liệu. Mỗi con số, ký hiệu, công thức PHẢI giữ nguyên như bản gốc.

QUAN TRỌNG — ĐÁP ÁN (KHÔNG ĐƯỢC BỎ TRỐNG):
- Với trắc nghiệm một đáp án (4 phương án A/B/C/D): trường correct_answer PHẢI luôn là đúng MỘT chữ "A", "B", "C" hoặc "D" (string).

THỨ TỰ TÌM ĐÁP ÁN (ưu tiên cao → thấp):
1. Bảng đáp án / Đáp án ở cuối đề (thường dạng bảng: Câu 1-D, Câu 2-A, ...) — LUÔN tìm trước
2. Dấu hiệu trực quan: dấu ✓, ★, khoanh tròn, gạch chân, in đậm tại phương án đúng
3. Ghi chú "Đáp án:", "Key:", "Đ/A:" cạnh từng câu
4. CHỈ KHI không tìm thấy ở cả 3 nguồn trên → mới dùng kiến thức Vật lý 12 để suy luận, và GHI RÕ trong explanation_html: "⚠️ Đáp án suy luận — đề không in key."

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

SAO CHÉP ĐẦY ĐỦ NỘI DUNG:
Với mỗi câu hỏi, nội dung content_html PHẢI bao gồm TOÀN BỘ đề bài — kể cả dữ kiện dài, bảng số liệu, đoạn mô tả tình huống. KHÔNG được tóm tắt. Nếu câu hỏi dài 10 dòng thì content_html cũng phải đủ 10 dòng.

GIỮ NGUYÊN CÔNG THỨC — LATEX BẮT BUỘC:
Mọi ký hiệu toán/vật lý PHẢI dùng LaTeX $...$. Tuyệt đối KHÔNG dùng Unicode superscript/subscript như ⁻¹ ⁻² ⁻³ ₁ ₂ ₃ α β ω φ.

Các mẫu LaTeX quan trọng:
- Hạt nhân: \${}_{Z}^{A}X$ — ví dụ \${}_{17}^{35}Cl$, \${}_{1}^{1}H$, \${}_{2}^{4}He$, \${}_{0}^{1}n$
- Phản ứng hạt nhân: \${}_{17}^{35}Cl + {}_{Z}^{A}X \\rightarrow {}_{16}^{32}S + {}_{2}^{4}He$
- Vectơ: $\\vec{B}$, $\\vec{F}$, $\\vec{v}$, $\\vec{E}$
- Số mũ âm: $2{,}0 \\times 10^{-3}$ hoặc $2{,}0.10^{-3}$ (KHÔNG viết 10⁻³)
- Chỉ số dưới: $L_0$, $v_1$, $I_0$, $U_C$
- Căn: $\\sqrt{2}$, $\\sqrt{LC}$
- Góc: $60^\\circ$, $\\alpha = 30^\\circ$
- Phân số vật lý: $\\frac{1}{2}mv^2$, $\\frac{Q}{t}$

VÍ DỤ content_html ĐÚNG:
"Một đoạn dây dài $L=0{,}8$ m đặt trong từ trường, hợp với $\\vec{B}$ góc $\\alpha=60^\\circ$. Biết $I=20$ A, lực từ $F=2{,}0 \\times 10^{-2}$ N. Độ lớn cảm ứng từ $B$ là"
"Cho phản ứng: \${}_{17}^{35}Cl + {}_{Z}^{A}X \\rightarrow {}_{16}^{32}S + {}_{2}^{4}He$. Hạt nhân X là"

VÍ DỤ option ĐÚNG:
"$1{,}4 \\times 10^{-3}$ T" (KHÔNG phải "1,4 . 10⁻³ T")
"\${}_{1}^{1}H$" (KHÔNG phải "₁H¹")

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
   - correct_answer: luôn điền nội dung — nếu đề có lời giải thì copy; nếu không có thì viết lời giải gợi ý ngắn (không để null hoặc chuỗi rỗng)

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

/** Ghép vào cuối prompt khi gửi PDF/Word cho Groq — buộc chỉ trả JSON */
const OCR_OUTPUT_JSON_ONLY = `

=== ĐẦU RA (bắt buộc) ===
Trả về MỘT object JSON hợp lệ duy nhất với khóa "questions" (mảng) và "metadata" (object).
Mỗi phần tử questions có trắc nghiệm 4 lựa chọn PHẢI có correct_answer là "A"|"B"|"C"|"D".
Không dùng markdown, không bọc \`\`\`, không thêm lời giải thích trước hoặc sau JSON.
Lưu ý: copy CHÍNH XÁC nội dung từng câu hỏi từ đề gốc, KHÔNG tóm tắt. Nếu đề có bảng đáp án ở cuối thì dùng đáp án từ bảng đó.`;

/** Giới hạn độ dài text gửi LLM (tránh vượt context / timeout) */
const MAX_PDF_TEXT_CHARS = 120000;
/** Đủ ký tự text trong PDF → dùng luồng text (nhanh). Dưới ngưỡng → coi như scan, render từng trang. */
const MIN_PDF_TEXT_USE_TEXT_PATH = Math.max(
  40,
  parseInt(process.env.MIN_PDF_TEXT_FOR_OCR || '120', 10)
);
const MAX_PDF_PAGES_RENDER_OCR = Math.min(
  60,
  Math.max(1, parseInt(process.env.MAX_PDF_PAGES_OCR || '30', 10))
);
const PDF_PAGE_OCR_DELAY_MS = Math.max(
  0,
  parseInt(process.env.PDF_PAGE_OCR_DELAY_MS || '1200', 10)
);
/** Một request Groq OCR trên toàn bộ text PDF — vượt ngưỡng thì quét ảnh từng trang (nhiều request nhỏ hơn). */
const MAX_PDF_TEXT_CHARS_SINGLE_GROQ_OCR = Math.max(
  8000,
  parseInt(process.env.MAX_PDF_TEXT_FOR_SINGLE_GROQ_OCR || '24000', 10)
);
/** Độ phóng to khi render PDF → PNG. 1.5 đủ đọc chỉ số hạt nhân nhỏ như ₁₇³⁵Cl. */
const PDF_PAGE_RENDER_SCALE = Math.min(
  2,
  Math.max(0.72, parseFloat(process.env.PDF_PAGE_RENDER_SCALE || '1.5') || 1.5)
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isGroqRateOrQuotaError = (err) => {
  if (!err) return false;
  const status = err.status ?? err.response?.status;
  let msg = String(err.message || '');
  try {
    const b = err.error ?? err.response?.data;
    if (b && typeof b === 'object') msg += ` ${JSON.stringify(b)}`;
    else if (typeof b === 'string') msg += ` ${b}`;
  } catch (_) {
    /* ignore */
  }
  if (status === 413 || status === 429) return true;
  if (/rate_limit|too large|TPM|tokens per minute|Request too large/i.test(msg)) return true;
  return false;
};

/** Lỗi text-OCR PDF nên chuyển sang quét ảnh từng trang (tránh 1 request quá lớn / TPM / context). */
const shouldFallbackPdfTextOcrToRenderedPages = (err) => {
  if (isGroqRateOrQuotaError(err)) return true;
  const m = String(err?.message || err || '');
  if (
    /context length|maximum context|token limit|too many tokens|exceeds?.*token|max.*?tokens|payload too large|request too large/i.test(
      m
    )
  ) {
    return true;
  }
  return false;
};

/**
 * Groq free tier hay gặp 413/429 TPM — chờ rồi thử lại.
 */
const groqChatCompletionsCreateWithRetry = async (groq, payload, { maxAttempts = 5 } = {}) => {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await groq.chat.completions.create(payload);
    } catch (e) {
      lastErr = e;
      const retryable = isGroqRateOrQuotaError(e);
      if (!retryable || attempt === maxAttempts) {
        throw e;
      }
      const waitMs = Math.min(90_000, 4000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 2000));
      console.warn(
        `⚠️ Groq TPM/rate — chờ ${Math.round(waitMs / 1000)}s rồi thử lại (${attempt}/${maxAttempts}): ${e.message || e}`
      );
      // eslint-disable-next-line no-await-in-loop
      await sleep(waitMs);
    }
  }
  throw lastErr;
};

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

/** Trích text PDF, không ném lỗi (dùng để quyết định text vs render trang). */
const tryExtractPdfText = async (buffer) => {
  let parser;
  try {
    const data = Buffer.isBuffer(buffer) ? new Uint8Array(buffer) : buffer;
    parser = new PDFParse({ data });
    const result = await parser.getText();
    let text = result?.text != null ? String(result.text).trim() : '';
    if (text.length > MAX_PDF_TEXT_CHARS) {
      text =
        text.slice(0, MAX_PDF_TEXT_CHARS) +
        '\n\n[... phần sau đã bị cắt do giới hạn độ dài ...]';
    }
    return text;
  } catch (e) {
    console.warn('tryExtractPdfText:', e?.message || e);
    return '';
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

const extractTextFromWord = async (buffer, originalName = '') => {
  const ext = path.extname(originalName || '').toLowerCase();
  try {
    const result = await mammoth.extractRawText({ buffer });
    let text = String(result.value || '').trim();
    const score = (s) => s.replace(/\s/g, '').length;
    if (score(text) < 50) {
      const html = await mammoth.convertToHtml({ buffer });
      const fromHtml = String(html.value || '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (score(fromHtml) > score(text)) {
        text = fromHtml;
      }
    }
    if (score(text) < 20) {
      throw new Error('WORD_NO_EXTRACTABLE_TEXT');
    }
    if (text.length > MAX_PDF_TEXT_CHARS) {
      console.warn(`⚠️ Word text truncated: ${text.length} → ${MAX_PDF_TEXT_CHARS} chars`);
      text =
        text.slice(0, MAX_PDF_TEXT_CHARS) +
        '\n\n[... phần sau đã bị cắt do giới hạn độ dài ...]';
    }
    return text;
  } catch (error) {
    if (error.message === 'WORD_NO_EXTRACTABLE_TEXT') {
      throw error;
    }
    console.error('Word Parse Error:', error);
    if (ext === '.doc') {
      throw new Error('DOC_LEGACY_NOT_SUPPORTED');
    }
    throw new Error('Không thể đọc file Word');
  }
};

const ocrWithGemini = async (fileBuffer, mimeType, meta = {}) => {
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
    const text = await extractTextFromWord(fileBuffer, meta.originalName || '');
    content = [OCR_EXAM_PROMPT + '\n\nNội dung đề thi:\n' + text];
  } else {
    const visionTail =
      '\n\n(Lưu ý khi đọc ảnh đề: mỗi câu trắc nghiệm A–D phải có correct_answer là "A","B","C" hoặc "D"; không để trống.)';
    const imagePart = {
      inlineData: {
        data: fileBuffer.toString('base64'),
        mimeType: mimeType
      }
    };
    content = [OCR_EXAM_PROMPT + visionTail, imagePart];
  }

  const result = await model.generateContent(content);
  const response = await result.response;
  return response.text();
};

const repairOcrJsonWithGroq = async (brokenText) => {
  const groq = getGroqClient();
  const snippet = String(brokenText).slice(0, 120000);
  const completion = await groqChatCompletionsCreateWithRetry(groq, {
    model: MODELS.groq.text,
    messages: [
      {
        role: 'system',
        content:
          'You output ONLY one valid JSON object. Top-level keys must be "questions" (array of question objects) and "metadata" (object). No markdown, no code fences, no commentary.'
      },
      {
        role: 'user',
        content: `The following text was supposed to be JSON but may be broken or wrapped in prose. Extract or fix into one valid JSON object.\n\n---\n${snippet}\n---`
      }
    ],
    temperature: 0,
    max_tokens: 16384,
    response_format: { type: 'json_object' }
  });
  const c = completion?.choices?.[0]?.message?.content;
  if (!c || !String(c).trim()) {
    throw new Error('Bước sửa JSON: Groq không trả nội dung');
  }
  return String(c);
};

const ocrWithGroq = async (fileBuffer, mimeType, meta = {}) => {
  const groq = getGroqClient();

  let messages = [];

  if (mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const text = await extractTextFromWord(fileBuffer, meta.originalName || '');
    messages = [
      {
        role: 'system',
        content:
          'Bạn trích xuất câu hỏi trắc nghiệm từ đề thi. Trả lời CHỈ bằng một object JSON hợp lệ. Không markdown.'
      },
      {
        role: 'user',
        content: OCR_EXAM_PROMPT + '\n\nNội dung đề thi:\n' + text + OCR_OUTPUT_JSON_ONLY
      }
    ];
  } else {
    const base64Image = fileBuffer.toString('base64');
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    const visionPromptTail = `

=== YÊU CẦU KHI ĐỌC ẢNH ĐỀ THI VẬT LÝ ===

LATEX BẮT BUỘC — MỌI CÔNG THỨC PHẢI DÙNG $...$:
- Hạt nhân: \${}_{Z}^{A}X$ — ví dụ \${}_{17}^{35}Cl$, \${}_{1}^{1}H$, \${}_{2}^{4}He$, \${}_{0}^{1}n$
- Phản ứng hạt nhân: \${}_{17}^{35}Cl + {}_{Z}^{A}X \\rightarrow {}_{16}^{32}S + {}_{2}^{4}He$
- Vectơ: $\\vec{B}$, $\\vec{F}$, $\\vec{v}$, $\\vec{E}$
- Số mũ âm: $2{,}0 \\times 10^{-3}$ — KHÔNG viết 10⁻³ (Unicode)
- Chỉ số: $L_0$, $I_0$, $U_C$, $m_e$
- Căn: $\\sqrt{2}$  — Góc: $60^\\circ$
- KHÔNG dùng Unicode superscript ⁻¹ ⁻² ⁻³ hay subscript ₁ ₂ ₃ — luôn dùng LaTeX

VÍ DỤ content_html ĐÚNG:
"Một đoạn dây $L=0{,}8$ m hợp với $\\vec{B}$ góc $\\alpha=60^\\circ$, $I=20$ A, $F=2{,}0 \\times 10^{-2}$ N. Độ lớn $B$ là"
VÍ DỤ option ĐÚNG: "$1{,}4 \\times 10^{-3}$ T" (sai nếu viết "1,4 . 10⁻³ T")
"\${}_{17}^{35}Cl + {}_{Z}^{A}X \\rightarrow {}_{16}^{32}S + {}_{2}^{4}He$" (sai nếu dùng ký tự nhỏ Unicode)

ĐÁP ÁN: Với câu trắc nghiệm 4 phương án, correct_answer PHẢI là "A", "B", "C" hoặc "D". Tìm dấu *, khoanh tròn, gạch chân, hoặc bảng đáp án cuối đề. Không để trống.

SAO CHÉP ĐẦY ĐỦ: Copy CHÍNH XÁC toàn bộ nội dung câu hỏi — không tóm tắt, không bỏ bớt dữ kiện, giữ nguyên số liệu.

${OCR_OUTPUT_JSON_ONLY}`;
    messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: OCR_EXAM_PROMPT + visionPromptTail
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
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const model = isTextOnlyDoc ? MODELS.groq.textOcrFast : MODELS.groq.vision;

  const basePayload = {
    model,
    messages,
    temperature: isTextOnlyDoc ? 0.05 : 0.05,
    max_tokens: isTextOnlyDoc ? 16000 : 16000
  };

  let completion;
  if (isTextOnlyDoc) {
    try {
      completion = await groqChatCompletionsCreateWithRetry(groq, {
        ...basePayload,
        response_format: { type: 'json_object' }
      });
    } catch (e) {
      console.warn('⚠️ Groq json_object không khả dụng, thử lại không ràng buộc:', e.message);
      completion = await groqChatCompletionsCreateWithRetry(groq, basePayload);
    }
  } else {
    completion = await groqChatCompletionsCreateWithRetry(groq, basePayload);
  }

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
  let s = raw.trim().replace(/^\uFEFF/, '');
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

/** Đoán A-D từ chữ in trong đề (đáp án, key, khoanh tròn...) */
const guessABCDFromQuestionBlob = (q) => {
  const parts = [
    q.content_html,
    q.contentHtml,
    ...Object.values(q.options || {})
  ]
    .filter(Boolean)
    .map((x) => String(x));
  const blob = parts.join('\n');
  const patterns = [
    /(?:đáp\s*án|dap\s*an|đ\s*\/\s*s|D\/S|key)\s*[:\.]?\s*([ABCD])\b/i,
    /\bchọn\s*(?:phương\s*án\s*)?([ABCD])\b/i,
    /\(([ABCD])\)\s*(?:là\s*)?(?:đúng|dap an dung)/i,
    /(?:đáp\s*án\s*đúng|phương\s*án\s*đúng)\s*[:\.]?\s*([ABCD])\b/i,
    /\*\s*([ABCD])\s*\*\s*(?:đúng|\(đúng)/i,
    /【\s*([ABCD])\s*】/i,
    /(?:^|[\s.])Đ\s*[:.]\s*([ABCD])\b/im
  ];
  for (const re of patterns) {
    const m = blob.match(re);
    if (m && m[1]) return String(m[1]).toUpperCase().charAt(0);
  }
  return null;
};

const parseOcrResponse = (text) => {
  let parsed = extractJsonObjectFromAiText(text);
  if (!parsed) {
    console.error('OCR parse fail — raw head:', String(text).slice(0, 800));
    throw new Error('Không thể parse JSON từ response của AI');
  }

  if (Array.isArray(parsed)) {
    parsed = {
      questions: parsed,
      metadata: { total_questions: parsed.length, subject: 'Vật Lý 12' }
    };
  }

  if (parsed.questions) {
    parsed.questions = parsed.questions.map((q, index) => {
      const qType = normalizeQuestionType(q.question_type);
      let correctAnswer = q.correct_answer;
      
      if (qType === 'trac_nghiem_1_dap_an') {
        let letter = null;
        if (correctAnswer != null && String(correctAnswer).trim() !== '') {
          const ch = String(correctAnswer).toUpperCase().trim().charAt(0);
          if (['A', 'B', 'C', 'D'].includes(ch)) letter = ch;
        }
        if (!letter) letter = guessABCDFromQuestionBlob(q);
        correctAnswer = letter;
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

/**
 * Sau OCR: câu trắc nghiệm 1 đáp án vẫn thiếu A–D → Groq suy luận; nếu vẫn thiếu → gán A + ghi chú.
 */
const enrichOcrQuestionsWithMissingAnswers = async (parsed) => {
  if (!parsed?.questions?.length) return;

  const needGroq = [];
  parsed.questions.forEach((q, idx) => {
    const qType = normalizeQuestionType(q.question_type);
    if (qType !== 'trac_nghiem_1_dap_an') return;
    const ca = q.correct_answer;
    const ok =
      ca != null &&
      String(ca).trim() !== '' &&
      ['A', 'B', 'C', 'D'].includes(String(ca).trim().toUpperCase().charAt(0));
    if (!ok) {
      needGroq.push({
        i: idx,
        content_html: String(q.content_html || q.contentHtml || '').slice(0, 1400),
        options: q.options || {}
      });
    }
  });

  if (needGroq.length > 0) {
    try {
      const groq = getGroqClient();
      const completion = await groqChatCompletionsCreateWithRetry(groq, {
        model: MODELS.groq.text,
        messages: [
          {
            role: 'system',
            content:
              'Bạn là giáo viên Vật lý 12. Input là JSON mảng các object {i, content_html, options}. Mỗi câu là trắc nghiệm 4 phương án A-D nhưng thiếu đáp án. Trả về CHỈ một JSON: {"items":[{"i":number,"correct_answer":"A"|"B"|"C"|"D"}]}. Trường i phải khớp input. Chọn đáp án đúng theo vật lý nếu đề không ghi key.'
          },
          { role: 'user', content: JSON.stringify(needGroq) }
        ],
        temperature: 0.15,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });
      const raw = completion?.choices?.[0]?.message?.content;
      if (raw) {
        const fill = extractJsonObjectFromAiText(String(raw));
        const items = fill?.items;
        if (Array.isArray(items)) {
          for (const it of items) {
            const idx = typeof it.i === 'number' ? it.i : parseInt(it.i, 10);
            const letter = String(it.correct_answer ?? it.answer ?? '')
              .trim()
              .toUpperCase()
              .charAt(0);
            if (!Number.isInteger(idx) || idx < 0 || idx >= parsed.questions.length) continue;
            if (!['A', 'B', 'C', 'D'].includes(letter)) continue;
            parsed.questions[idx].correct_answer = letter;
          }
        }
      }
    } catch (e) {
      console.warn('enrichOcrQuestionsWithMissingAnswers (Groq):', e.message);
    }
  }

  parsed.questions.forEach((q) => {
    const qType = normalizeQuestionType(q.question_type);
    if (qType === 'trac_nghiem_1_dap_an') {
      const ca = q.correct_answer;
      const ok =
        ca != null &&
        String(ca).trim() !== '' &&
        ['A', 'B', 'C', 'D'].includes(String(ca).trim().toUpperCase().charAt(0));
      if (!ok) {
        q.correct_answer = 'A';
        const note =
          '<p><em>[Hệ thống: chưa xác định được đáp án từ đề — tạm gán A; giáo viên vui lòng sửa.]</em></p>';
        q.explanation_html = q.explanation_html ? `${q.explanation_html}${note}` : note;
      } else {
        q.correct_answer = String(ca).trim().toUpperCase().charAt(0);
      }
    }
    if (qType === 'tu_luan' && (q.correct_answer == null || String(q.correct_answer).trim() === '')) {
      q.correct_answer =
        '(Chưa có đáp án trong đề — giáo viên vui lòng nhập lời giải / đáp án tự luận.)';
    }
  });
};

const parseOcrResponseWithRepair = async (responseText) => {
  let parsed;
  try {
    parsed = parseOcrResponse(responseText);
  } catch (parseErr) {
    console.warn('⚠️ Parse JSON lần 1 thất bại, sửa JSON (Groq 70B)...', parseErr.message);
    const repaired = await repairOcrJsonWithGroq(responseText);
    parsed = parseOcrResponse(repaired);
  }
  await enrichOcrQuestionsWithMissingAnswers(parsed);
  return parsed;
};

/** Groq: đã có sẵn chuỗi nội dung đề (từ PDF text / nguồn khác) */
const groqOcrExamFromExtractedText = async (examText) => {
  const groq = getGroqClient();
  const messages = [
    {
      role: 'system',
      content:
        'Bạn trích xuất câu hỏi trắc nghiệm từ đề thi. Trả lời CHỈ bằng một object JSON hợp lệ (theo hướng dẫn của user). Không markdown.'
    },
    {
      role: 'user',
      content: OCR_EXAM_PROMPT + '\n\nNội dung đề thi:\n' + examText + OCR_OUTPUT_JSON_ONLY
    }
  ];
  const basePayload = {
    model: MODELS.groq.textOcrFast,
    messages,
    temperature: 0.05,
    max_tokens: 16000
  };
  let completion;
  try {
    completion = await groqChatCompletionsCreateWithRetry(groq, {
      ...basePayload,
      response_format: { type: 'json_object' }
    });
  } catch (e) {
    console.warn('⚠️ Groq json_object không khả dụng, thử lại không ràng buộc:', e.message);
    completion = await groqChatCompletionsCreateWithRetry(groq, basePayload);
  }
  const content = completion?.choices?.[0]?.message?.content;
  if (!content || !String(content).trim()) {
    throw new Error('Groq không trả về nội dung. Thử lại hoặc kiểm tra API key.');
  }
  return String(content);
};

/**
 * Trích bảng đáp án từ text PDF (thường ở cuối đề dạng "Câu 1: D", "1 - A", ...).
 * Trả về object { questionNumber: 'A'|'B'|'C'|'D' }.
 */
const extractAnswerKeyFromPdfText = (text) => {
  if (!text || typeof text !== 'string') return {};
  const answers = {};

  // Tìm đoạn chứa bảng đáp án (phía cuối đề hoặc sau dòng có "ĐÁP ÁN")
  const markerRx = /đáp\s+án|bảng\s+đáp\s+án|answer\s+key/i;
  const markerIdx = text.search(markerRx);
  // Ưu tiên phần sau "đáp án"; nếu không có thì tìm toàn bộ text
  const section = markerIdx >= 0 ? text.slice(markerIdx) : text;

  // Mẫu: "Câu 1: D", "Câu 1. D", "câu 1 D"
  const rxCau = /câu\s+(\d{1,3})[:\.\s]+([ABCD])\b/gi;
  // Mẫu: "1 - D", "1. D", "1: D", "1 D" (chỉ nhận nếu chữ đứng độc lập sau số)
  const rxNum = /\b(\d{1,3})[\s\-:\.\,]+([ABCD])\b/g;

  const applyPattern = (rx, src) => {
    let m;
    while ((m = rx.exec(src)) !== null) {
      const num = parseInt(m[1], 10);
      const ans = m[2].toUpperCase();
      if (num >= 1 && num <= 200 && ['A', 'B', 'C', 'D'].includes(ans)) {
        if (!answers[num]) answers[num] = ans;
      }
    }
  };

  applyPattern(rxCau, section);
  // Chỉ dùng rxNum nếu tìm được ít hơn 5 câu từ rxCau (tránh nhầm số trong đề bài)
  if (Object.keys(answers).length < 5) {
    applyPattern(rxNum, section);
  }

  const count = Object.keys(answers).length;
  if (count > 0) {
    console.log(`📋 Bảng đáp án: ${count} câu (từ text layer PDF)`);
  }
  return answers;
};

/**
 * PDF scan / ít text: render từng trang → PNG (pdf-parse) → Groq vision → gộp câu hỏi.
 */
const ocrPdfViaRenderedPages = async (buffer) => {
  const data = Buffer.isBuffer(buffer) ? new Uint8Array(buffer) : buffer;
  let parser;
  const merged = [];
  const metadata = {
    subject: 'Vật Lý 12',
    pdf_rendered_pages: true,
    total_questions: 0,
    has_images: true
  };
  try {
    // Trích bảng đáp án từ lớp text trước khi OCR ảnh (nếu PDF có text layer)
    const fullText = await tryExtractPdfText(buffer);
    const answerKey = extractAnswerKeyFromPdfText(fullText);
    const hasAnswerKey = Object.keys(answerKey).length >= 5;

    parser = new PDFParse({ data });
    const info = await parser.getInfo();
    const total = Math.min(info.total || 1, MAX_PDF_PAGES_RENDER_OCR);
    console.log(
      `📑 PDF (ảnh từng trang): ${total} trang, scale ${PDF_PAGE_RENDER_SCALE}, delay ${PDF_PAGE_OCR_DELAY_MS}ms`
    );

    for (let page = 1; page <= total; page++) {
      const shot = await parser.getScreenshot({
        partial: [page],
        scale: PDF_PAGE_RENDER_SCALE,
        imageBuffer: true,
        imageDataUrl: false
      });
      const pdata = shot.pages[0]?.data;
      if (!pdata || !pdata.length) {
        console.warn(`⚠️ Trang ${page}: không render được bitmap, bỏ qua`);
        continue;
      }
      const pngBuf = Buffer.from(pdata);
      const raw = await ocrWithGroq(pngBuf, 'image/png');
      const parsed = await parseOcrResponseWithRepair(raw);
      const qs = parsed.questions || [];
      for (const q of qs) {
        merged.push({
          ...q,
          page_number: page,
          source_file: 'pdf',
          pdf_rendered_page: true
        });
      }
      if (page < total && PDF_PAGE_OCR_DELAY_MS > 0) {
        await delay(PDF_PAGE_OCR_DELAY_MS);
      }
    }

    if (merged.length === 0) {
      throw new Error(
        'Không trích được câu từ PDF (không đủ lớp text và không đọc được nội dung qua ảnh trang). Thử PDF khác hoặc tách ảnh từng trang upload riêng.'
      );
    }

    await enrichOcrQuestionsWithMissingAnswers({ questions: merged, metadata });

    // Áp dụng bảng đáp án (nếu trích được) — ghi đè đáp án AI suy luận
    if (hasAnswerKey) {
      let applied = 0;
      merged.forEach((q, i) => {
        const qNum = q.order_number ?? (i + 1);
        const qType = normalizeQuestionType(q.question_type);
        if (qType === 'trac_nghiem_1_dap_an' && answerKey[qNum]) {
          const prev = q.correct_answer;
          q.correct_answer = answerKey[qNum];
          if (prev !== answerKey[qNum]) {
            applied++;
            // Ghi chú nếu AI đã suy luận sai
            const note = '<p><em>[Đáp án lấy từ bảng đáp án cuối đề]</em></p>';
            if (!q.explanation_html || q.explanation_html.includes('⚠️')) {
              q.explanation_html = (q.explanation_html || '').replace(/<p><em>⚠️.*?<\/em><\/p>/g, '') + note;
            }
          }
        }
      });
      if (applied > 0) {
        console.log(`✅ Cập nhật đáp án từ bảng đáp án: ${applied} câu`);
      }
    }

    merged.forEach((q, i) => {
      q.order_number = i + 1;
    });
    metadata.total_questions = merged.length;
    return { questions: merged, metadata };
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

const isImageFile = (mimeType) => {
  return mimeType.startsWith('image/');
};

const ocrExamImage = async (fileBuffer, mimeType = 'image/png', meta = {}) => {
  // Gemini key có quota/xác thực lỗi — chỉ dùng Groq
  const useGeminiForImages = false;

  try {
    if (mimeType === 'application/pdf') {
      // Luôn dùng vision path cho PDF vật lý — text extraction làm hỏng công thức
      // (ký hiệu hạt nhân, số mũ, ký hiệu vectơ bị strip bởi pdf-parse)
      console.log(`📄 PDF → Groq Vision (render từng trang — bảo toàn công thức toán học)`);
      return await ocrPdfViaRenderedPages(fileBuffer);
    }

    let responseText;

    if (isImageFile(mimeType) && useGeminiForImages) {
      console.log('🖼️ Image detected → Trying Gemini Vision...');
      try {
        responseText = await ocrWithGemini(fileBuffer, mimeType, meta);
      } catch (geminiError) {
        console.error('❌ Gemini failed:', geminiError.message);
        console.log('🔄 Falling back to Groq Vision...');
        responseText = await ocrWithGroq(fileBuffer, mimeType, meta);
      }
    } else if (isImageFile(mimeType)) {
      console.log('🖼️ Image detected → Using Groq Vision...');
      responseText = await ocrWithGroq(fileBuffer, mimeType, meta);
    } else {
      console.log('📄 Word → Groq text (model:', MODELS.groq.textOcrFast, ')');
      responseText = await ocrWithGroq(fileBuffer, mimeType, meta);
    }

    return await parseOcrResponseWithRepair(responseText);
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
      
      const fileResult = await ocrExamImage(file.buffer, file.mimetype, {
        originalName: file.originalname
      });

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
    const completion = await groqChatCompletionsCreateWithRetry(groq, {
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
    const completion = await groqChatCompletionsCreateWithRetry(groq, {
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
