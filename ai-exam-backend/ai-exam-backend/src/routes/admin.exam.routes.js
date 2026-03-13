const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const {
  getPendingExams,
  getExamForReview,
  approveExam,
  rejectExam,
  getAllExamsAdmin
} = require('../controllers/admin.exam.controller');

router.use(authenticate);
router.use(authorizeRoles('admin'));

/**
 * @swagger
 * tags:
 *   name: Admin Exams
 *   description: Admin quản lý và duyệt đề thi
 */

/**
 * @swagger
 * /api/admin/exams:
 *   get:
 *     summary: Lấy tất cả đề thi (Admin)
 *     tags: [Admin Exams]
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
 *         description: Danh sách tất cả đề thi
 */
router.get('/', getAllExamsAdmin);

/**
 * @swagger
 * /api/admin/exams/pending:
 *   get:
 *     summary: Lấy danh sách đề thi chờ duyệt
 *     tags: [Admin Exams]
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
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Danh sách đề thi chờ duyệt
 */
router.get('/pending', getPendingExams);

/**
 * @swagger
 * /api/admin/exams/{id}/review:
 *   get:
 *     summary: Xem chi tiết đề thi để duyệt
 *     tags: [Admin Exams]
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
 *         description: Chi tiết đề thi với thống kê
 */
router.get('/:id/review', getExamForReview);

/**
 * @swagger
 * /api/admin/exams/{id}/approve:
 *   patch:
 *     summary: Duyệt đề thi
 *     tags: [Admin Exams]
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
 *         description: Duyệt đề thi thành công
 */
router.patch('/:id/approve', approveExam);

/**
 * @swagger
 * /api/admin/exams/{id}/reject:
 *   patch:
 *     summary: Từ chối đề thi
 *     tags: [Admin Exams]
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
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Lý do từ chối
 *     responses:
 *       200:
 *         description: Từ chối đề thi thành công
 */
router.patch('/:id/reject', rejectExam);

module.exports = router;
