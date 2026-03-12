const express = require('express');
const router = express.Router();
const { authenticate, isTeacher } = require('../middlewares/auth.middleware');
const { uploadExamFiles, handleMulterError } = require('../middlewares/upload.middleware');
const {
  ocrExamImageHandler,
  saveOcrQuestions,
  createManualQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  generateQuestionExplanation,
  getQuestionStats
} = require('../controllers/question.controller');

/**
 * @swagger
 * components:
 *   schemas:
 *     QuestionOptions:
 *       type: object
 *       properties:
 *         A:
 *           type: string
 *           example: "2π rad/s"
 *         B:
 *           type: string
 *           example: "π rad/s"
 *         C:
 *           type: string
 *           example: "4π rad/s"
 *         D:
 *           type: string
 *           example: "0.5π rad/s"
 *     Question:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         contentHtml:
 *           type: string
 *           description: Nội dung câu hỏi (HTML/LaTeX)
 *         options:
 *           $ref: '#/components/schemas/QuestionOptions'
 *         topic:
 *           type: string
 *           enum: [dao_dong_co, song_co, dien_xoay_chieu, song_anh_sang, luong_tu_anh_sang, vat_ly_hat_nhan]
 *         bloomLevel:
 *           type: string
 *           enum: [nhan_biet, thong_hieu, van_dung, van_dung_cao]
 *         correctAnswer:
 *           type: string
 *           enum: [A, B, C, D]
 *         explanationHtml:
 *           type: string
 *         isAiGenerated:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *     CreateQuestionRequest:
 *       type: object
 *       required:
 *         - content_html
 *         - topic
 *         - bloom_level
 *       properties:
 *         content_html:
 *           type: string
 *           example: "Một con lắc lò xo dao động điều hòa với chu kỳ T = 0.5s. Tần số góc của dao động là?"
 *         options:
 *           $ref: '#/components/schemas/QuestionOptions'
 *         topic:
 *           type: string
 *           enum: [dao_dong_co, song_co, dien_xoay_chieu, song_anh_sang, luong_tu_anh_sang, vat_ly_hat_nhan]
 *           example: dao_dong_co
 *         bloom_level:
 *           type: string
 *           enum: [nhan_biet, thong_hieu, van_dung, van_dung_cao]
 *           example: van_dung
 *         correct_answer:
 *           type: string
 *           enum: [A, B, C, D]
 *           example: A
 *         explanation_html:
 *           type: string
 *           example: "Tần số góc ω = 2π/T = 2π/0.5 = 4π rad/s"
 *     OCRResult:
 *       type: object
 *       properties:
 *         questions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               content_html:
 *                 type: string
 *               options:
 *                 $ref: '#/components/schemas/QuestionOptions'
 *               correct_answer:
 *                 type: string
 *               topic:
 *                 type: string
 *               bloom_level:
 *                 type: string
 *         metadata:
 *           type: object
 *           properties:
 *             total_questions:
 *               type: integer
 *             exam_title:
 *               type: string
 */

/**
 * @swagger
 * tags:
 *   - name: Questions
 *     description: APIs quản lý ngân hàng câu hỏi Vật Lý 12
 */

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/questions/stats:
 *   get:
 *     summary: Lấy thống kê câu hỏi
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thống kê câu hỏi
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
 *                     total:
 *                       type: integer
 *                     aiGenerated:
 *                       type: integer
 *                     manualCreated:
 *                       type: integer
 *                     byTopic:
 *                       type: object
 *                     byBloomLevel:
 *                       type: object
 */
router.get('/stats', getQuestionStats);

/**
 * @swagger
 * /api/questions:
 *   get:
 *     summary: Lấy danh sách câu hỏi (có filter & pagination)
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Số câu hỏi mỗi trang
 *       - in: query
 *         name: topic
 *         schema:
 *           type: string
 *           enum: [dao_dong_co, song_co, dien_xoay_chieu, song_anh_sang, luong_tu_anh_sang, vat_ly_hat_nhan]
 *         description: Lọc theo chủ đề
 *       - in: query
 *         name: bloom_level
 *         schema:
 *           type: string
 *           enum: [nhan_biet, thong_hieu, van_dung, van_dung_cao]
 *         description: Lọc theo mức độ Bloom
 *       - in: query
 *         name: is_ai_generated
 *         schema:
 *           type: boolean
 *         description: Lọc câu hỏi do AI tạo
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo nội dung
 *     responses:
 *       200:
 *         description: Danh sách câu hỏi
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
 *                       items:
 *                         $ref: '#/components/schemas/Question'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 */
router.get('/', getQuestions);

/**
 * @swagger
 * /api/questions/{id}:
 *   get:
 *     summary: Lấy chi tiết câu hỏi
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID câu hỏi
 *     responses:
 *       200:
 *         description: Chi tiết câu hỏi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Question'
 *       404:
 *         description: Không tìm thấy câu hỏi
 */
router.get('/:id', getQuestionById);

// Teacher-only routes
/**
 * @swagger
 * /api/questions/ocr:
 *   post:
 *     summary: OCR - Trích xuất câu hỏi từ file đề thi (AI)
 *     description: |
 *       Upload 1 hoặc nhiều file đề thi để AI trích xuất câu hỏi.
 *       
 *       **Định dạng hỗ trợ:** JPG, PNG, WebP, GIF, PDF, DOC, DOCX
 *       
 *       **Giới hạn:** Tối đa 10 file, mỗi file tối đa 20MB
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
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
 *                 description: File đề thi (JPG, PNG, PDF, DOC, DOCX) - có thể upload nhiều file
 *     responses:
 *       200:
 *         description: Kết quả OCR
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Trích xuất thành công 10 câu hỏi từ 2 file
 *                 data:
 *                   type: object
 *                   properties:
 *                     questions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         total_questions:
 *                           type: integer
 *                         files_processed:
 *                           type: integer
 *                         errors:
 *                           type: array
 *       400:
 *         description: Không có file hoặc định dạng không hỗ trợ
 */
router.post('/ocr', isTeacher, uploadExamFiles.array('files', 10), handleMulterError, ocrExamImageHandler);

/**
 * @swagger
 * /api/questions/ocr/save:
 *   post:
 *     summary: Lưu câu hỏi từ kết quả OCR vào database
 *     tags: [Questions]
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
 *                     content_html:
 *                       type: string
 *                     options:
 *                       $ref: '#/components/schemas/QuestionOptions'
 *                     topic:
 *                       type: string
 *                     bloom_level:
 *                       type: string
 *                     correct_answer:
 *                       type: string
 *                     explanation_html:
 *                       type: string
 *     responses:
 *       201:
 *         description: Lưu thành công
 */
router.post('/ocr/save', isTeacher, saveOcrQuestions);

/**
 * @swagger
 * /api/questions/manual:
 *   post:
 *     summary: Tạo câu hỏi thủ công
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateQuestionRequest'
 *     responses:
 *       201:
 *         description: Tạo câu hỏi thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Question'
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post('/manual', isTeacher, createManualQuestion);

/**
 * @swagger
 * /api/questions/{id}:
 *   put:
 *     summary: Cập nhật câu hỏi
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateQuestionRequest'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy câu hỏi
 *   delete:
 *     summary: Xóa câu hỏi
 *     tags: [Questions]
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
 *       404:
 *         description: Không tìm thấy câu hỏi
 */
router.put('/:id', isTeacher, updateQuestion);
router.delete('/:id', isTeacher, deleteQuestion);

/**
 * @swagger
 * /api/questions/{id}/generate-explanation:
 *   post:
 *     summary: AI tạo lời giải cho câu hỏi
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID câu hỏi cần tạo lời giải
 *     responses:
 *       200:
 *         description: Tạo lời giải thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     explanation_html:
 *                       type: string
 *       400:
 *         description: Câu hỏi chưa có đáp án đúng
 *       404:
 *         description: Không tìm thấy câu hỏi
 */
router.post('/:id/generate-explanation', isTeacher, generateQuestionExplanation);

module.exports = router;
