const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const {
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignments,
  getAssignmentsByClass,
  getAssignmentById,
  startAssignment,
  getAssignmentQuestions,
  submitAssignment,
  getAssignmentResult,
  getAssignmentProgress
} = require('../controllers/assignment.controller');

/**
 * @swagger
 * tags:
 *   - name: Assignments
 *     description: Giao bài tập / Thi thử chuẩn cấu trúc
 */

/**
 * @swagger
 * /api/assignments:
 *   get:
 *     summary: Danh sách bài tập
 *     description: Teacher xem bài mình giao, Student xem bài lớp mình học
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: classId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Danh sách assignments
 *   post:
 *     summary: Giao bài tập / Thi thử
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - classId
 *               - title
 *               - assignmentType
 *             properties:
 *               classId:
 *                 type: integer
 *               examId:
 *                 type: integer
 *                 description: Bắt buộc khi assignmentType=fixed_exam
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               assignmentType:
 *                 type: string
 *                 enum: [fixed_exam, random_config]
 *               examConfig:
 *                 type: object
 *                 description: Bắt buộc khi assignmentType=random_config (subjectId, totalQuestions, distribution)
 *               deadline:
 *                 type: string
 *                 format: date-time
 *               durationMinutes:
 *                 type: integer
 *                 default: 60
 *     responses:
 *       201:
 *         description: Giao bài thành công
 */

/**
 * @swagger
 * /api/assignments/{id}:
 *   get:
 *     summary: Chi tiết bài tập
 *     tags: [Assignments]
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
 *         description: Chi tiết assignment
 *   put:
 *     summary: Cập nhật bài tập
 *     tags: [Assignments]
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
 *               deadline:
 *                 type: string
 *                 format: date-time
 *               durationMinutes:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *   delete:
 *     summary: Xóa bài tập
 *     tags: [Assignments]
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

/**
 * @swagger
 * /api/assignments/{id}/start:
 *   post:
 *     summary: Bắt đầu làm bài (Student)
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Trả về câu hỏi + bắt đầu đếm giờ
 */

/**
 * @swagger
 * /api/assignments/{id}/questions:
 *   get:
 *     summary: Lấy câu hỏi (sau khi start)
 *     tags: [Assignments]
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
 *         description: Danh sách câu hỏi
 */

/**
 * @swagger
 * /api/assignments/{id}/submit:
 *   post:
 *     summary: Nộp bài (Student)
 *     tags: [Assignments]
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
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId:
 *                       type: integer
 *                     selectedAnswer:
 *                       type: string
 *               timeSpentSeconds:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Nộp bài thành công
 */

/**
 * @swagger
 * /api/assignments/{id}/result:
 *   get:
 *     summary: Xem kết quả (Student)
 *     tags: [Assignments]
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
 *         description: Kết quả kèm lời giải
 */

/**
 * @swagger
 * /api/assignments/{id}/progress:
 *   get:
 *     summary: Theo dõi tiến độ lớp (Teacher)
 *     tags: [Assignments]
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
 *         description: Ai đã làm, điểm, thời gian
 */

router.use(authenticate);

router.post('/', authorizeRoles('teacher', 'admin'), createAssignment);
router.get('/', authorizeRoles('teacher', 'student'), getAssignments);

router.post('/:id/start', authorizeRoles('student'), startAssignment);
router.get('/:id/questions', authorizeRoles('student'), getAssignmentQuestions);
router.post('/:id/submit', authorizeRoles('student'), submitAssignment);
router.get('/:id/result', authorizeRoles('student'), getAssignmentResult);
router.get('/:id/progress', authorizeRoles('teacher', 'admin'), getAssignmentProgress);

router.get('/:id', authorizeRoles('teacher', 'student', 'admin'), getAssignmentById);
router.put('/:id', authorizeRoles('teacher', 'admin'), updateAssignment);
router.delete('/:id', authorizeRoles('teacher', 'admin'), deleteAssignment);

module.exports = router;
