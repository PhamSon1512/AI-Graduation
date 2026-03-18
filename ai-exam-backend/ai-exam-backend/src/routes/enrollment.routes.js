const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const {
  enrollInClass,
  getMyEnrollments,
  getPendingEnrollments,
  approveEnrollment,
  rejectEnrollment
} = require('../controllers/enrollment.controller');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Enrollments
 *   description: Đăng ký lớp học (Student tự đăng ký, Teacher duyệt)
 */

// ==================== STUDENT: SELF-ENROLLMENT ====================

/**
 * @swagger
 * /api/enrollments:
 *   post:
 *     summary: Học sinh đăng ký vào lớp học bằng tên lớp
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - className
 *             properties:
 *               className:
 *                 type: string
 *                 description: Tên lớp học muốn đăng ký
 *                 example: "Lớp 12A1 - Vật Lý"
 *     responses:
 *       201:
 *         description: Đăng ký thành công, chờ giáo viên duyệt
 *       404:
 *         description: Không tìm thấy lớp học
 *       409:
 *         description: Đã đăng ký lớp này rồi
 */
router.post('/', authorizeRoles('student'), enrollInClass);

/**
 * @swagger
 * /api/enrollments/my:
 *   get:
 *     summary: Học sinh xem danh sách lớp đã đăng ký
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách lớp đã đăng ký (kèm trạng thái pending/active)
 */
router.get('/my', authorizeRoles('student'), getMyEnrollments);

// ==================== TEACHER: ENROLLMENT MANAGEMENT ====================

/**
 * @swagger
 * /api/enrollments/pending:
 *   get:
 *     summary: Giáo viên xem danh sách học sinh chờ duyệt
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: classId
 *         schema:
 *           type: integer
 *         description: Lọc theo lớp cụ thể
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
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Danh sách học sinh chờ duyệt
 */
router.get('/pending', authorizeRoles('teacher', 'admin'), getPendingEnrollments);

/**
 * @swagger
 * /api/enrollments/{id}/approve:
 *   patch:
 *     summary: Giáo viên duyệt yêu cầu đăng ký lớp
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của bản ghi đăng ký (ClassStudent ID)
 *     responses:
 *       200:
 *         description: Duyệt thành công
 *       403:
 *         description: Không có quyền duyệt lớp này
 *       404:
 *         description: Không tìm thấy yêu cầu
 */
router.patch('/:id/approve', authorizeRoles('teacher', 'admin'), approveEnrollment);

/**
 * @swagger
 * /api/enrollments/{id}/reject:
 *   patch:
 *     summary: Giáo viên từ chối yêu cầu đăng ký lớp
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của bản ghi đăng ký (ClassStudent ID)
 *     responses:
 *       200:
 *         description: Từ chối thành công
 *       403:
 *         description: Không có quyền từ chối lớp này
 *       404:
 *         description: Không tìm thấy yêu cầu
 */
router.patch('/:id/reject', authorizeRoles('teacher', 'admin'), rejectEnrollment);

module.exports = router;
