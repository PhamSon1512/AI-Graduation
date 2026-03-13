const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');
const {
  createExam,
  getExams,
  getExamById,
  updateExam,
  submitExamForApproval,
  deleteExam,
  addQuestionToExam,
  importQuestionsFromExcel,
  ocrQuestionsForExam,
  getExcelTemplates,
  downloadExcelTemplate
} = require('../controllers/exam.controller');
const {
  getOcrSession,
  reviewOcrQuestions,
  approveAllOcrQuestions,
  saveOcrQuestions,
  cancelOcrSession
} = require('../controllers/ocr.controller');
const {
  getRandomQuestions,
  getAvailableQuestionsCount
} = require('../controllers/random.controller');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Exams
 *     description: Quản lý đề thi
 *   - name: Exam Questions
 *     description: Quản lý câu hỏi trong đề thi
 *   - name: OCR Sessions
 *     description: Quản lý phiên OCR (AI quét đề)
 *   - name: Random Questions
 *     description: Lấy câu hỏi ngẫu nhiên
 */

// ==================== EXCEL TEMPLATES ====================

/**
 * @swagger
 * /api/exams/excel-templates:
 *   get:
 *     summary: Lấy danh sách template Excel
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách templates
 */
router.get('/excel-templates', authorizeRoles('teacher', 'admin'), getExcelTemplates);

/**
 * @swagger
 * /api/exams/excel-templates/{templateId}/download:
 *   get:
 *     summary: Tải file Excel template mẫu
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [template_1, template_2, template_3]
 *     responses:
 *       200:
 *         description: File Excel
 */
router.get('/excel-templates/:templateId/download', authorizeRoles('teacher', 'admin'), downloadExcelTemplate);

// ==================== RANDOM QUESTIONS ====================

/**
 * @swagger
 * /api/questions/random:
 *   post:
 *     summary: Lấy câu hỏi ngẫu nhiên theo phân bổ
 *     tags: [Random Questions]
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
 *             properties:
 *               subjectId:
 *                 type: integer
 *               totalQuestions:
 *                 type: integer
 *                 default: 50
 *               distribution:
 *                 type: object
 *                 description: Phân bổ theo bloom level
 *               excludeExamIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               topicDistribution:
 *                 type: object
 *                 description: Phân bổ theo topic
 *     responses:
 *       200:
 *         description: Danh sách câu hỏi random
 */
router.post('/random', authorizeRoles('teacher', 'admin'), getRandomQuestions);

/**
 * @swagger
 * /api/questions/random/available:
 *   get:
 *     summary: Xem số lượng câu hỏi có sẵn theo tiêu chí
 *     tags: [Random Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thống kê câu hỏi
 */
router.get('/random/available', authorizeRoles('teacher', 'admin'), getAvailableQuestionsCount);

// ==================== EXAM CRUD ====================

/**
 * @swagger
 * /api/exams:
 *   get:
 *     summary: Lấy danh sách đề thi
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending, approved, rejected]
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách đề thi
 *   post:
 *     summary: Tạo đề thi mới (nháp)
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - title
 *               - subjectId
 *             properties:
 *               code:
 *                 type: string
 *                 example: VL12-001
 *               title:
 *                 type: string
 *                 example: Đề kiểm tra Vật Lý 12 - Chương 1
 *               description:
 *                 type: string
 *               subjectId:
 *                 type: integer
 *               durationMinutes:
 *                 type: integer
 *                 default: 45
 *     responses:
 *       201:
 *         description: Tạo đề thi thành công
 */
router.route('/')
  .get(authorizeRoles('teacher', 'admin'), getExams)
  .post(authorizeRoles('teacher'), createExam);

/**
 * @swagger
 * /api/exams/{id}:
 *   get:
 *     summary: Xem chi tiết đề thi
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chi tiết đề thi
 *   put:
 *     summary: Cập nhật thông tin đề thi
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               durationMinutes:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *   delete:
 *     summary: Xóa đề thi
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.route('/:id')
  .get(authorizeRoles('teacher', 'admin'), getExamById)
  .put(authorizeRoles('teacher'), updateExam)
  .delete(authorizeRoles('teacher', 'admin'), deleteExam);

/**
 * @swagger
 * /api/exams/{id}/submit:
 *   post:
 *     summary: Gửi đề thi chờ duyệt
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Gửi duyệt thành công
 */
router.post('/:id/submit', authorizeRoles('teacher'), submitExamForApproval);

// ==================== EXAM QUESTIONS ====================

/**
 * @swagger
 * /api/exams/{examId}/questions:
 *   post:
 *     summary: Thêm câu hỏi thủ công vào đề
 *     tags: [Exam Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content_html
 *             properties:
 *               content_html:
 *                 type: string
 *               options:
 *                 type: object
 *               question_type:
 *                 type: string
 *                 enum: [trac_nghiem, tu_luan]
 *               topic:
 *                 type: string
 *               bloom_level:
 *                 type: string
 *                 enum: [nhan_biet, thong_hieu, van_dung, van_dung_cao]
 *               correct_answer:
 *                 type: string
 *               explanation_html:
 *                 type: string
 *     responses:
 *       201:
 *         description: Thêm câu hỏi thành công
 */
router.post('/:examId/questions', authorizeRoles('teacher'), addQuestionToExam);

/**
 * @swagger
 * /api/exams/{examId}/questions/import:
 *   post:
 *     summary: Import câu hỏi từ file Excel
 *     tags: [Exam Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               templateId:
 *                 type: string
 *                 enum: [template_1, template_2, template_3]
 *                 default: template_1
 *     responses:
 *       201:
 *         description: Import thành công
 */
router.post('/:examId/questions/import', authorizeRoles('teacher'), upload.single('file'), importQuestionsFromExcel);

/**
 * @swagger
 * /api/exams/{examId}/questions/ocr:
 *   post:
 *     summary: AI quét đề từ file ảnh/PDF
 *     tags: [Exam Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Trích xuất câu hỏi thành công, cần duyệt trước khi lưu
 */
router.post('/:examId/questions/ocr', authorizeRoles('teacher'), upload.array('files', 10), ocrQuestionsForExam);

// ==================== OCR SESSIONS ====================

/**
 * @swagger
 * /api/exams/{examId}/ocr-sessions/{sessionId}:
 *   get:
 *     summary: Xem chi tiết phiên OCR
 *     tags: [OCR Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chi tiết phiên OCR
 *   delete:
 *     summary: Hủy phiên OCR
 *     tags: [OCR Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hủy thành công
 */
router.route('/:examId/ocr-sessions/:sessionId')
  .get(authorizeRoles('teacher'), getOcrSession)
  .delete(authorizeRoles('teacher'), cancelOcrSession);

/**
 * @swagger
 * /api/exams/{examId}/ocr-sessions/{sessionId}/review:
 *   patch:
 *     summary: Duyệt từng câu hỏi OCR
 *     tags: [OCR Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - questions
 *             properties:
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     index:
 *                       type: integer
 *                     approved:
 *                       type: boolean
 *                     correct_answer:
 *                       type: string
 *                     bloom_level:
 *                       type: string
 *                     topic:
 *                       type: string
 *     responses:
 *       200:
 *         description: Duyệt thành công
 */
router.patch('/:examId/ocr-sessions/:sessionId/review', authorizeRoles('teacher'), reviewOcrQuestions);

/**
 * @swagger
 * /api/exams/{examId}/ocr-sessions/{sessionId}/approve-all:
 *   post:
 *     summary: Duyệt tất cả câu hỏi OCR
 *     tags: [OCR Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Duyệt tất cả thành công
 */
router.post('/:examId/ocr-sessions/:sessionId/approve-all', authorizeRoles('teacher'), approveAllOcrQuestions);

/**
 * @swagger
 * /api/exams/{examId}/ocr-sessions/{sessionId}/save:
 *   post:
 *     summary: Lưu câu hỏi đã duyệt vào đề
 *     tags: [OCR Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Lưu thành công
 */
router.post('/:examId/ocr-sessions/:sessionId/save', authorizeRoles('teacher'), saveOcrQuestions);

module.exports = router;
