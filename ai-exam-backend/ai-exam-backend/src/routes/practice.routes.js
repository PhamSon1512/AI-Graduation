const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const {
  startPractice,
  getPracticeQuestions,
  updateProgress,
  submitPractice,
  getPracticeResult,
  getPracticeHistory
} = require('../controllers/practice.controller');

/**
 * @swagger
 * tags:
 *   - name: Practice
 *     description: Luồng luyện tập (Chọn môn → chuyên đề → Random câu hỏi → Làm bài → Xem kết quả)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     StartPracticeRequest:
 *       type: object
 *       required:
 *         - subjectId
 *       properties:
 *         subjectId:
 *           type: integer
 *           example: 1
 *         topicId:
 *           type: integer
 *           description: Chuyên đề (optional)
 *         count:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *     SubmitPracticeRequest:
 *       type: object
 *       properties:
 *         answers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               sessionQuestionId:
 *                 type: integer
 *               questionId:
 *                 type: integer
 *               selectedAnswer:
 *                 type: string
 *                 enum: [A, B, C, D]
 *     ProgressRequest:
 *       type: object
 *       required:
 *         - answers
 *       properties:
 *         answers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               sessionQuestionId:
 *                 type: integer
 *               selectedAnswer:
 *                 type: string
 */

router.use(authenticate);
router.use(authorizeRoles('student'));

/**
 * @swagger
 * /api/practice/start:
 *   post:
 *     summary: Bắt đầu luyện tập
 *     tags: [Practice]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StartPracticeRequest'
 *     responses:
 *       201:
 *         description: Tạo phiên luyện tập thành công
 *       400:
 *         description: Thiếu subjectId hoặc không đủ câu hỏi
 */
router.post('/start', startPractice);

/**
 * @swagger
 * /api/practice/history:
 *   get:
 *     summary: Xem lịch sử luyện tập
 *     tags: [Practice]
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
 *     responses:
 *       200:
 *         description: Danh sách phiên luyện tập
 */
router.get('/history', getPracticeHistory);

/**
 * @swagger
 * /api/practice/{sessionId}/questions:
 *   get:
 *     summary: Lấy câu hỏi luyện tập
 *     tags: [Practice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Danh sách câu hỏi (không có đáp án đúng/lời giải)
 *       404:
 *         description: Không tìm thấy phiên
 */
router.get('/:sessionId/questions', getPracticeQuestions);

/**
 * @swagger
 * /api/practice/{sessionId}/progress:
 *   patch:
 *     summary: Lưu tiến độ luyện tập
 *     tags: [Practice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProgressRequest'
 *     responses:
 *       200:
 *         description: Đã lưu tiến độ
 */
router.patch('/:sessionId/progress', updateProgress);

/**
 * @swagger
 * /api/practice/{sessionId}/submit:
 *   post:
 *     summary: Nộp bài luyện tập
 *     tags: [Practice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitPracticeRequest'
 *     responses:
 *       200:
 *         description: Nộp bài thành công
 */
router.post('/:sessionId/submit', submitPractice);

/**
 * @swagger
 * /api/practice/{sessionId}/result:
 *   get:
 *     summary: Xem kết quả luyện tập (kèm lời giải chi tiết)
 *     tags: [Practice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Kết quả với explanationHtml từng câu
 *       404:
 *         description: Không tìm thấy phiên
 */
router.get('/:sessionId/result', getPracticeResult);

module.exports = router;
