const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const {
  explainQuestionHandler,
  stepSolutionHandler,
  generateQuestionHandler,
  generateExamHandler,
  saveGeneratedExam,
  getGenerationOptions
} = require('../controllers/ai.controller');
const {
  getStudentAnalysis,
  getClassAnalysis,
  getPredictScore,
  getStudyPlan,
  putStudyPlan
} = require('../controllers/ai.analysis.controller');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: AI Tutor
 *     description: AI hỗ trợ học sinh giải bài
 *   - name: AI Generator
 *     description: AI sinh câu hỏi và đề thi cho giáo viên
 */

// ==================== AI TUTOR (Student) ====================

/**
 * @swagger
 * /api/ai/explain:
 *   post:
 *     summary: AI giải thích câu hỏi
 *     tags: [AI Tutor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               questionId:
 *                 type: integer
 *                 description: ID câu hỏi trong database
 *               question:
 *                 type: object
 *                 description: Hoặc truyền trực tiếp object câu hỏi
 *                 properties:
 *                   content_html:
 *                     type: string
 *                   options:
 *                     type: object
 *                   correct_answer:
 *                     type: string
 *           examples:
 *             byId:
 *               summary: Theo questionId
 *               value:
 *                 questionId: 1
 *             byObject:
 *               summary: Theo object
 *               value:
 *                 question:
 *                   content_html: "Công thức tính vận tốc dao động điều hòa?"
 *                   options: { "A": "v = ωA", "B": "v = ω²A", "C": "v = A/ω", "D": "v = ωA²" }
 *                   correct_answer: "A"
 *     responses:
 *       200:
 *         description: Giải thích thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     question:
 *                       type: object
 *                     explanation:
 *                       type: string
 */
router.post('/explain', authorizeRoles('student', 'teacher', 'admin'), explainQuestionHandler);

/**
 * @swagger
 * /api/ai/step-solution:
 *   post:
 *     summary: AI giải chi tiết từng bước
 *     tags: [AI Tutor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               questionId:
 *                 type: integer
 *               question:
 *                 type: object
 *     responses:
 *       200:
 *         description: Giải chi tiết thành công
 */
router.post('/step-solution', authorizeRoles('student', 'teacher', 'admin'), stepSolutionHandler);

// ==================== AI GENERATOR (Teacher) ====================

/**
 * @swagger
 * /api/ai/generation-options:
 *   get:
 *     summary: Lấy thông tin để sinh câu hỏi (subjects, topics, bloom levels)
 *     tags: [AI Generator]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách options
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subjects:
 *                   type: array
 *                   items:
 *                     type: object
 *                 bloomLevels:
 *                   type: array
 *                 questionTypes:
 *                   type: array
 *                 defaultTopics:
 *                   type: array
 */
router.get('/generation-options', authorizeRoles('teacher', 'admin'), getGenerationOptions);

/**
 * @swagger
 * /api/ai/generate-question:
 *   post:
 *     summary: AI sinh câu hỏi mới
 *     tags: [AI Generator]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subjectId
 *               - topic
 *               - bloomLevel
 *             properties:
 *               subjectId:
 *                 type: integer
 *                 description: ID môn học
 *                 example: 1
 *               topic:
 *                 type: string
 *                 description: Chủ đề câu hỏi
 *                 example: dao_dong_co
 *               bloomLevel:
 *                 type: string
 *                 enum: [nhan_biet, thong_hieu, van_dung, van_dung_cao]
 *                 description: Mức độ Bloom
 *                 example: van_dung
 *               questionType:
 *                 type: string
 *                 enum: [trac_nghiem, tu_luan]
 *                 default: trac_nghiem
 *               count:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 20
 *                 default: 5
 *                 description: Số câu hỏi cần sinh
 *     responses:
 *       200:
 *         description: Sinh câu hỏi thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     questions:
 *                       type: array
 *                     subject:
 *                       type: object
 */
router.post('/generate-question', authorizeRoles('teacher', 'admin'), generateQuestionHandler);

/**
 * @swagger
 * /api/ai/generate-exam:
 *   post:
 *     summary: AI sinh đề thi hoàn chỉnh
 *     tags: [AI Generator]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - request
 *             properties:
 *               request:
 *                 type: string
 *                 description: Yêu cầu bằng ngôn ngữ tự nhiên
 *                 example: "Tạo đề thi Vật Lý 12 minh họa kỳ thi tốt nghiệp THPT, 40 câu, 60 phút"
 *               subjectId:
 *                 type: integer
 *                 description: ID môn học (optional, AI sẽ tự detect)
 *     responses:
 *       200:
 *         description: Sinh đề thi thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     exam:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                         total_questions:
 *                           type: integer
 *                         duration_minutes:
 *                           type: integer
 *                     questions:
 *                       type: array
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         from_bank:
 *                           type: integer
 *                         ai_generated:
 *                           type: integer
 *                     aiAnalysis:
 *                       type: object
 *                       description: Phân tích của AI về cấu trúc đề
 */
router.post('/generate-exam', authorizeRoles('teacher', 'admin'), generateExamHandler);

/**
 * @swagger
 * /api/ai/save-generated-exam:
 *   post:
 *     summary: Lưu đề thi AI đã sinh vào database
 *     tags: [AI Generator]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - exam
 *               - questions
 *             properties:
 *               exam:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                   subject_id:
 *                     type: integer
 *                   duration_minutes:
 *                     type: integer
 *                   description:
 *                     type: string
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Lưu đề thi thành công
 */
router.post('/save-generated-exam', authorizeRoles('teacher', 'admin'), saveGeneratedExam);

// ==================== AI ANALYSIS MODULE ====================

/**
 * @swagger
 * /api/ai/analysis/student/{id}:
 *   get:
 *     summary: Phân tích kết quả cá nhân học sinh
 *     tags: [AI Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID học sinh (student xem chính mình dùng id của mình)
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: integer
 *         description: Lọc theo môn học (optional)
 *     responses:
 *       200:
 *         description: Phân tích + gợi ý (click gợi ý → forward đến study-plan)
 */
router.get('/analysis/student/:id', authorizeRoles('student', 'teacher', 'admin'), getStudentAnalysis);

/**
 * @swagger
 * /api/ai/analysis/class/{classId}:
 *   get:
 *     summary: Phân tích kết quả lớp học
 *     tags: [AI Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Phân tích + gợi ý (click → forward đến giáo án, kế hoạch cải thiện)
 */
router.get('/analysis/class/:classId', authorizeRoles('teacher', 'admin'), getClassAnalysis);

/**
 * @swagger
 * /api/ai/predict-score:
 *   get:
 *     summary: Dự đoán điểm thi dựa trên bài thi thử
 *     tags: [AI Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Điểm dự đoán + khoảng tin cậy + giải thích
 */
router.get('/predict-score', authorizeRoles('student', 'teacher', 'admin'), getPredictScore);

// ==================== AI STUDY PLAN MODULE ====================

/**
 * @swagger
 * /api/ai/study-plan:
 *   get:
 *     summary: Lấy lộ trình học (tạo mới nếu chưa có)
 *     tags: [AI Study Plan]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lộ trình học, kế hoạch cải thiện
 *   put:
 *     summary: Cập nhật lộ trình học
 *     tags: [AI Study Plan]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: object
 *               subjectId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Đã cập nhật
 */
router.get('/study-plan', authorizeRoles('student', 'teacher', 'admin'), getStudyPlan);
router.put('/study-plan', authorizeRoles('student', 'teacher', 'admin'), putStudyPlan);

module.exports = router;
