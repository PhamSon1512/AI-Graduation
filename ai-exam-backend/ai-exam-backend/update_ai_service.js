const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'services', 'ai.service.js');
let content = fs.readFileSync(filePath, 'utf8');

// Convert const OCR_EXAM_PROMPT = `...` to const getOcrExamPrompt = (subjectName, topicsArr) => { return `...`; }
// We'll replace the hardcoded "Vật Lý 12" inside the template with ${subjectName} and PHYSICS_12_TOPICS with ${topicsArr.join(', ')}

// Step 1: Find the start of OCR_EXAM_PROMPT and its end.
const promptStartMarker = 'const OCR_EXAM_PROMPT = `Bạn là chuyên gia OCR đề thi.';
const promptEndMarker = 'Kết quả:\n{\n  "question_type": "tu_luan",\n  "options": null,\n  "correct_answer": "Từ phương trình x = A.cos(ωt + φ), ta có: a = -ω²x. Vì ω² > 0 nên a và x luôn trái dấu, gia tốc luôn hướng về VTCB."\n}`;\n';

const startIndex = content.indexOf(promptStartMarker);
const endIndex = content.indexOf('}`;', startIndex) + 3;

let promptBlock = content.substring(startIndex, endIndex);

// Make it a function
promptBlock = promptBlock.replace('const OCR_EXAM_PROMPT = `', 'const getOcrExamPrompt = (subjectName, topicsArr) => {\n  const topicsStr = topicsArr && topicsArr.length > 0 ? topicsArr.join(", ") : "general";\n  return `');
promptBlock = promptBlock.replace(/Bạn là chuyên gia OCR đề thi/g, 'Bạn là chuyên gia OCR đề thi môn ${subjectName}');
promptBlock = promptBlock.replace(/Vật lý 12/gi, '${subjectName}');
promptBlock = promptBlock.replace(/Vật Lý 12/gi, '${subjectName}');
promptBlock = promptBlock.replace(/Vật lý/gi, '${subjectName}');
promptBlock = promptBlock.replace(/vật lý/gi, '${subjectName}');
promptBlock = promptBlock.replace(/\$\{PHYSICS_12_TOPICS\.join\(\', \'\)\}/g, '${topicsStr}');
promptBlock = promptBlock.replace(/const OCR_EXAM_PROMPT =/g, ''); // in case
// Replace end
promptBlock = promptBlock.substring(0, promptBlock.length - 1) + ';\n};'; // change `;\n to \n};\n

content = content.substring(0, startIndex) + promptBlock + content.substring(endIndex);

// Replace usages
content = content.replace(/OCR_EXAM_PROMPT/g, 'getOcrExamPrompt(meta.subjectName || "THPT", meta.topics)');

// Remove PHYSICS_12_TOPICS references
content = content.replace(/PHYSICS_12_TOPICS\.includes\(q\.topic\)/g, '(meta.topics || []).includes(q.topic)');
content = content.replace(/PHYSICS_12_TOPICS\.includes/g, '(meta.topics || []).includes');

// enrichOcrQuestionsWithMissingAnswers
content = content.replace(/const enrichOcrQuestionsWithMissingAnswers = async \(parsed\) =>/g, 'const enrichOcrQuestionsWithMissingAnswers = async (parsed, meta = {}) =>');
content = content.replace(/'Bạn là giáo viên Vật lý 12\./g, '`Bạn là giáo viên ${meta.subjectName || "THPT"}.');
content = content.replace(/Bạn là giáo viên Vật Lý 12 giỏi/gi, 'Bạn là giáo viên ${meta.subjectName || "THPT"} giỏi');
content = content.replace(/Bạn là giáo viên Vật Lý 12/gi, 'Bạn là giáo viên ${meta.subjectName || "THPT"}');
content = content.replace(/Phân tích câu hỏi Vật Lý 12/gi, 'Phân tích câu hỏi ${meta.subjectName || "THPT"}');
content = content.replace(/giáo viên Vật Lý 12 chuyên/gi, 'giáo viên ${meta.subjectName || "THPT"} chuyên');

// ocrWithGroq tail
content = content.replace(/YÊU CẦU KHI ĐỌC ẢNH ĐỀ THI VẬT LÝ/g, 'YÊU CẦU KHI ĐỌC ẢNH ĐỀ THI MÔN ${meta.subjectName || "THPT"}');

// parseOcrResponse needs meta passed to it
content = content.replace(/const parseOcrResponse = \(text\) => {/g, 'const parseOcrResponse = (text, meta = {}) => {');
content = content.replace(/metadata: { total_questions: parsed\.length, subject: 'Vật Lý 12' }/g, 'metadata: { total_questions: parsed.length, subject: meta.subjectName || "THPT" }');
content = content.replace(/parseOcrResponse\(text\)/g, 'parseOcrResponse(text, meta)');

// enrich call
content = content.replace(/await enrichOcrQuestionsWithMissingAnswers\(parsed\)/g, 'await enrichOcrQuestionsWithMissingAnswers(parsed, meta)');

// Fix specific regex calls that pass hardcoded subject
content = content.replace(/'Vật Lý 12'/g, 'meta.subjectName || "THPT"');
content = content.replace(/"Vật Lý 12"/g, 'meta.subjectName || "THPT"');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated ai.service.js');
