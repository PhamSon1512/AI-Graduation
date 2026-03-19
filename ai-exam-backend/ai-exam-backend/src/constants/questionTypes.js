/**
 * Các loại câu hỏi theo form đề chuẩn THPT
 * PHẦN I: Trắc nghiệm 1 đáp án đúng (A, B, C, D)
 * PHẦN II: Trắc nghiệm đúng sai (4 phát biểu a, b, c, d - mỗi cái Đúng/Sai)
 * PHẦN III: Trắc nghiệm trả lời ngắn (nhập số, có quy tắc làm tròn)
 * PHẦN IV: Tự luận (câu hỏi mở, đáp án là text dài)
 * Bổ sung: Trắc nghiệm nhiều đáp án đúng (A, B, C, D - chọn 1 hoặc nhiều)
 */

const QUESTION_TYPES = [
  'trac_nghiem',
  'tu_luan',
  'trac_nghiem_1_dap_an',
  'trac_nghiem_nhieu_dap_an',
  'trac_nghiem_dung_sai',
  'trac_nghiem_tra_loi_ngan'
];

const QUESTION_TYPE_LABELS = {
  trac_nghiem: 'Trắc nghiệm (legacy)',
  tu_luan: 'Tự luận',
  trac_nghiem_1_dap_an: 'Trắc nghiệm 1 đáp án đúng',
  trac_nghiem_nhieu_dap_an: 'Trắc nghiệm nhiều đáp án đúng',
  trac_nghiem_dung_sai: 'Trắc nghiệm đúng sai',
  trac_nghiem_tra_loi_ngan: 'Trắc nghiệm trả lời ngắn'
};

const ROUNDING_RULES = [
  { value: 'integer', label: 'Số nguyên (hàng đơn vị)' },
  { value: '1_decimal', label: '1 chữ số thập phân' },
  { value: '2_decimals', label: '2 chữ số thập phân' },
  { value: '3_decimals', label: '3 chữ số thập phân' }
];

const normalizeQuestionType = (type) => {
  if (!type) return 'trac_nghiem_1_dap_an';
  const t = String(type).toLowerCase().trim();
  if (t === 'trac_nghiem' || t === 'trac_nghiem_1_dap_an') return 'trac_nghiem_1_dap_an';
  if (t === 'trac_nghiem_tra_loi_ngan') return 'trac_nghiem_tra_loi_ngan';
  if (t === 'tu_luan') return 'tu_luan';
  if (QUESTION_TYPES.includes(t)) return t;
  return 'trac_nghiem_1_dap_an';
};

module.exports = {
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  ROUNDING_RULES,
  normalizeQuestionType
};
