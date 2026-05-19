const fs = require('fs');
const filePath = 'src/services/ai.service.js';
let txt = fs.readFileSync(filePath, 'utf8');

// Fix line 906-908
txt = txt.replace(/`Bạn là giáo viên \$\{meta\.subjectName \|\| "THPT"\}\. Input là JSON mảng câu trắc nghiệm trả lời ngắn \(nhập số\)\. \' \+/g, '`Bạn là giáo viên ${meta.subjectName || "THPT"}. Input là JSON mảng câu trắc nghiệm trả lời ngắn (nhập số). ` +');
txt = txt.replace(/'Tính toán từ dữ kiện và công thức vật lý để tìm số đáp án\. ' \+/g, '`Tính toán từ dữ kiện và công thức vật lý để tìm số đáp án. ` +');
txt = txt.replace(/'Trả về JSON: \{"items":\[\{"i":number,"correct_answer":"số_đáp_án","rounding_rule":"integer\|1_decimal\|2_decimals"\}\]\}'/g, '`Trả về JSON: {"items":[{"i":number,"correct_answer":"số_đáp_án","rounding_rule":"integer|1_decimal|2_decimals"}]}`');

fs.writeFileSync(filePath, txt, 'utf8');
console.log('Fixed syntax!');
