const XLSX = require('xlsx');

const { QUESTION_TYPES, normalizeQuestionType } = require('../constants/questionTypes');
const BLOOM_LEVELS = ['nhan_biet', 'thong_hieu', 'van_dung', 'van_dung_cao'];

const EXCEL_TEMPLATES = {
  template_1: {
    id: 'template_1',
    name: 'Template Cơ Bản',
    description: 'Template đơn giản cho câu hỏi trắc nghiệm',
    columns: {
      stt: { required: false, aliases: ['stt', 'STT', 'Số thứ tự', 'so_thu_tu', '#'] },
      content: { required: true, aliases: ['content', 'noi_dung', 'Nội dung', 'Câu hỏi', 'cau_hoi', 'question'] },
      option_a: { required: true, aliases: ['option_a', 'A', 'Đáp án A', 'dap_an_a', 'a'] },
      option_b: { required: true, aliases: ['option_b', 'B', 'Đáp án B', 'dap_an_b', 'b'] },
      option_c: { required: true, aliases: ['option_c', 'C', 'Đáp án C', 'dap_an_c', 'c'] },
      option_d: { required: true, aliases: ['option_d', 'D', 'Đáp án D', 'dap_an_d', 'd'] },
      correct_answer: { required: true, aliases: ['correct_answer', 'dap_an_dung', 'Đáp án đúng', 'answer', 'dap_an'] },
      bloom_level: { required: false, aliases: ['bloom_level', 'muc_do', 'Mức độ', 'level', 'do_kho'] },
      topic: { required: false, aliases: ['topic', 'chu_de', 'Chủ đề', 'chuong', 'Chương'] }
    },
    sample: [
      { stt: 1, content: 'Công thức tính vận tốc trong dao động điều hòa là?', option_a: 'v = ωA', option_b: 'v = ω²A', option_c: 'v = ωA²', option_d: 'v = A/ω', correct_answer: 'A', bloom_level: 'nhan_biet', topic: 'dao_dong_co' },
      { stt: 2, content: 'Đơn vị của tần số góc ω là?', option_a: 'Hz', option_b: 'rad/s', option_c: 'm/s', option_d: 's', correct_answer: 'B', bloom_level: 'nhan_biet', topic: 'dao_dong_co' }
    ]
  },

  template_2: {
    id: 'template_2',
    name: 'Template Đầy Đủ',
    description: 'Template đầy đủ với lời giải và loại câu hỏi',
    columns: {
      stt: { required: false, aliases: ['stt', 'STT', '#'] },
      content: { required: true, aliases: ['content', 'noi_dung', 'Nội dung', 'Câu hỏi'] },
      question_type: { required: false, aliases: ['question_type', 'loai_cau_hoi', 'Loại', 'type'] },
      option_a: { required: false, aliases: ['option_a', 'A', 'Đáp án A'] },
      option_b: { required: false, aliases: ['option_b', 'B', 'Đáp án B'] },
      option_c: { required: false, aliases: ['option_c', 'C', 'Đáp án C'] },
      option_d: { required: false, aliases: ['option_d', 'D', 'Đáp án D'] },
      correct_answer: { required: true, aliases: ['correct_answer', 'dap_an_dung', 'Đáp án đúng'] },
      explanation: { required: false, aliases: ['explanation', 'loi_giai', 'Lời giải', 'giai_thich'] },
      bloom_level: { required: false, aliases: ['bloom_level', 'muc_do', 'Mức độ'] },
      topic: { required: false, aliases: ['topic', 'chu_de', 'Chủ đề'] }
    },
    sample: [
      { stt: 1, content: 'Tính chu kỳ dao động của con lắc đơn có chiều dài 1m, g=10m/s²', question_type: 'trac_nghiem', option_a: '1s', option_b: '2s', option_c: '0.5s', option_d: '4s', correct_answer: 'B', explanation: 'T = 2π√(l/g) = 2π√(1/10) ≈ 2s', bloom_level: 'van_dung', topic: 'dao_dong_co' },
      { stt: 2, content: 'Giải thích hiện tượng cộng hưởng trong dao động cưỡng bức', question_type: 'tu_luan', correct_answer: 'Cộng hưởng xảy ra khi tần số ngoại lực bằng tần số riêng...', bloom_level: 'thong_hieu', topic: 'dao_dong_co' }
    ]
  },

  template_3: {
    id: 'template_3',
    name: 'Template Tự Luận',
    description: 'Template cho câu hỏi tự luận ngắn',
    columns: {
      stt: { required: false, aliases: ['stt', 'STT', '#'] },
      content: { required: true, aliases: ['content', 'noi_dung', 'Nội dung', 'Câu hỏi'] },
      correct_answer: { required: true, aliases: ['correct_answer', 'dap_an', 'Đáp án', 'answer'] },
      explanation: { required: false, aliases: ['explanation', 'loi_giai', 'Hướng dẫn chấm'] },
      bloom_level: { required: false, aliases: ['bloom_level', 'muc_do', 'Mức độ'] },
      topic: { required: false, aliases: ['topic', 'chu_de', 'Chủ đề'] }
    },
    sample: [
      { stt: 1, content: 'Phát biểu định nghĩa dao động điều hòa', correct_answer: 'Dao động điều hòa là dao động mà li độ của vật là hàm sin hoặc cosin của thời gian', bloom_level: 'nhan_biet', topic: 'dao_dong_co' },
      { stt: 2, content: 'Tại sao khi thả một vật từ độ cao h xuống, vật dao động tắt dần?', correct_answer: 'Do ma sát và lực cản không khí làm mất năng lượng...', bloom_level: 'thong_hieu', topic: 'dao_dong_co' }
    ]
  }
};

const findColumnMapping = (headers, templateColumns) => {
  const mapping = {};
  const normalizedHeaders = headers.map(h => String(h || '').trim().toLowerCase());

  for (const [fieldName, fieldConfig] of Object.entries(templateColumns)) {
    const aliases = fieldConfig.aliases.map(a => a.toLowerCase());
    
    for (let i = 0; i < normalizedHeaders.length; i++) {
      if (aliases.includes(normalizedHeaders[i])) {
        mapping[fieldName] = i;
        break;
      }
    }
  }

  return mapping;
};

const validateColumnMapping = (mapping, templateColumns) => {
  const missingRequired = [];
  
  for (const [fieldName, fieldConfig] of Object.entries(templateColumns)) {
    if (fieldConfig.required && mapping[fieldName] === undefined) {
      missingRequired.push(fieldName);
    }
  }

  return {
    valid: missingRequired.length === 0,
    missingColumns: missingRequired
  };
};

const parseExcelFile = (buffer, templateId = 'template_1') => {
  try {
    const template = EXCEL_TEMPLATES[templateId];
    if (!template) {
      throw new Error(`Template "${templateId}" không tồn tại`);
    }

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (rawData.length < 2) {
      throw new Error('File Excel phải có ít nhất 1 hàng header và 1 hàng dữ liệu');
    }

    const headers = rawData[0];
    const columnMapping = findColumnMapping(headers, template.columns);
    
    const validation = validateColumnMapping(columnMapping, template.columns);
    if (!validation.valid) {
      throw new Error(`Thiếu các cột bắt buộc: ${validation.missingColumns.join(', ')}`);
    }

    const questions = [];
    const errors = [];

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      
      if (!row || row.every(cell => !cell)) continue;

      try {
        const question = extractQuestionFromRow(row, columnMapping, template, i);
        if (question) {
          questions.push(question);
        }
      } catch (error) {
        errors.push({ row: i + 1, error: error.message });
      }
    }

    return {
      success: true,
      templateUsed: templateId,
      totalRows: rawData.length - 1,
      questionsExtracted: questions.length,
      questions,
      errors,
      columnMapping
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      questions: [],
      errors: []
    };
  }
};

const extractQuestionFromRow = (row, columnMapping, template, rowIndex) => {
  const getValue = (fieldName) => {
    const colIndex = columnMapping[fieldName];
    if (colIndex === undefined) return null;
    const value = row[colIndex];
    return value !== undefined && value !== null ? String(value).trim() : null;
  };

  const content = getValue('content');
  if (!content) {
    throw new Error('Nội dung câu hỏi trống');
  }

  const questionTypeRaw = getValue('question_type');
  const questionType = normalizeQuestionType(questionTypeRaw || 'trac_nghiem_1_dap_an');

  const options = {};
  let correctAnswer = getValue('correct_answer');
  let roundingRule = getValue('rounding_rule') || null;

  if (questionType === 'trac_nghiem_dung_sai') {
    const optA = getValue('statement_a') || getValue('option_a');
    const optB = getValue('statement_b') || getValue('option_b');
    const optC = getValue('statement_c') || getValue('option_c');
    const optD = getValue('statement_d') || getValue('option_d');
    if (optA) options.a = optA;
    if (optB) options.b = optB;
    if (optC) options.c = optC;
    if (optD) options.d = optD;
    const ansA = getValue('answer_a');
    const ansB = getValue('answer_b');
    const ansC = getValue('answer_c');
    const ansD = getValue('answer_d');
    if (ansA !== undefined || ansB !== undefined || ansC !== undefined || ansD !== undefined) {
      correctAnswer = JSON.stringify({
        a: /true|dung|đúng|1/i.test(String(ansA || '')),
        b: /true|dung|đúng|1/i.test(String(ansB || '')),
        c: /true|dung|đúng|1/i.test(String(ansC || '')),
        d: /true|dung|đúng|1/i.test(String(ansD || ''))
      });
    }
  } else if (questionType === 'trac_nghiem_tra_loi_ngan') {
    correctAnswer = correctAnswer || getValue('dap_an_so');
    roundingRule = roundingRule || '1_decimal';
  } else {
    const optionA = getValue('option_a');
    const optionB = getValue('option_b');
    const optionC = getValue('option_c');
    const optionD = getValue('option_d');
    if (optionA) options.A = optionA;
    if (optionB) options.B = optionB;
    if (optionC) options.C = optionC;
    if (optionD) options.D = optionD;
    if (correctAnswer && questionType === 'trac_nghiem_nhieu_dap_an') {
      correctAnswer = String(correctAnswer).replace(/\s/g, '').toUpperCase();
    } else if (correctAnswer) {
      correctAnswer = String(correctAnswer).toUpperCase().charAt(0);
    }
  }

  if (!correctAnswer) {
    throw new Error('Thiếu đáp án đúng');
  }

  let bloomLevel = getValue('bloom_level');
  if (bloomLevel) {
    bloomLevel = bloomLevel.toLowerCase().replace(/\s+/g, '_');
    if (!BLOOM_LEVELS.includes(bloomLevel)) {
      bloomLevel = 'nhan_biet';
    }
  } else {
    bloomLevel = 'nhan_biet';
  }

  return {
    orderNumber: rowIndex,
    content_html: content,
    options: Object.keys(options).length > 0 ? options : null,
    question_type: questionType,
    correct_answer: correctAnswer,
    rounding_rule: roundingRule,
    explanation_html: getValue('explanation') || null,
    bloom_level: bloomLevel,
    topic: getValue('topic') || null
  };
};

const generateTemplateExcel = (templateId) => {
  const template = EXCEL_TEMPLATES[templateId];
  if (!template) {
    throw new Error(`Template "${templateId}" không tồn tại`);
  }

  const headers = Object.keys(template.columns);
  const data = [headers, ...template.sample.map(row => headers.map(h => row[h] || ''))];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  const colWidths = headers.map(h => ({ wch: Math.max(h.length, 15) }));
  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

const getTemplateInfo = (templateId = null) => {
  if (templateId) {
    const template = EXCEL_TEMPLATES[templateId];
    if (!template) return null;
    
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      columns: Object.entries(template.columns).map(([name, config]) => ({
        name,
        required: config.required,
        acceptedNames: config.aliases
      })),
      sampleRowCount: template.sample.length
    };
  }

  return Object.values(EXCEL_TEMPLATES).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    columnCount: Object.keys(t.columns).length,
    requiredColumns: Object.entries(t.columns)
      .filter(([_, config]) => config.required)
      .map(([name]) => name)
  }));
};

module.exports = {
  EXCEL_TEMPLATES,
  parseExcelFile,
  generateTemplateExcel,
  getTemplateInfo,
  BLOOM_LEVELS,
  QUESTION_TYPES,
  normalizeQuestionType
};
