const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const {
  createClass,
  updateClass,
  deleteClass,
  getClasses,
  getPublicClasses,
  getClassById,
  addStudentToClass,
  removeStudentFromClass,
  getClassResults
} = require('../controllers/class.controller');
const { getAssignmentsByClass } = require('../controllers/assignment.controller');

router.get('/public', getPublicClasses);

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Classes
 *   description: Quản lý lớp học
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Class:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         code:
 *           type: string
 *         description:
 *           type: string
 *         schoolYear:
 *           type: string
 *         isActive:
 *           type: boolean
 *         teacher:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             fullName:
 *               type: string
 *         subject:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *         studentCount:
 *           type: integer
 */

// ==================== CLASS CRUD ====================

/**
 * @swagger
 * /api/classes:
 *   get:
 *     summary: Lấy danh sách lớp học
 *     tags: [Classes]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm theo tên hoặc mã lớp
 *       - in: query
 *         name: teacherId
 *         schema:
 *           type: integer
 *         description: Lọc theo giáo viên (Admin only)
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: schoolYear
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Danh sách lớp học
 *   post:
 *     summary: Tạo lớp học mới (gán giáo viên)
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *               - teacherId
 *             properties:
 *               name:
 *                 type: string
 *                 example: Lớp 12A1 - Vật Lý
 *               code:
 *                 type: string
 *                 example: 12A1-VL
 *               description:
 *                 type: string
 *               schoolYear:
 *                 type: string
 *                 example: 2025-2026
 *               teacherId:
 *                 type: integer
 *                 description: ID giáo viên phụ trách
 *               subjectId:
 *                 type: integer
 *                 description: ID môn học (optional)
 *     responses:
 *       201:
 *         description: Tạo lớp thành công
 *       409:
 *         description: Mã lớp đã tồn tại
 */
router.route('/')
  .get(authorizeRoles('admin', 'teacher'), getClasses)
  .post(authorizeRoles('admin'), createClass);

/**
 * @swagger
 * /api/classes/{id}:
 *   get:
 *     summary: Xem chi tiết lớp học (kèm danh sách học sinh)
 *     tags: [Classes]
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
 *         description: Chi tiết lớp học
 *   put:
 *     summary: Cập nhật lớp học
 *     tags: [Classes]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               schoolYear:
 *                 type: string
 *               teacherId:
 *                 type: integer
 *               subjectId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *   delete:
 *     summary: Xóa lớp học (soft delete)
 *     tags: [Classes]
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
  .get(authorizeRoles('admin', 'teacher'), getClassById)
  .put(authorizeRoles('admin'), updateClass)
  .delete(authorizeRoles('admin'), deleteClass);

// ==================== STUDENT MANAGEMENT ====================

/**
 * @swagger
 * /api/classes/{classId}/students:
 *   post:
 *     summary: Thêm học sinh vào lớp (Duyệt student)
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               studentId:
 *                 type: integer
 *                 description: ID một học sinh
 *               studentIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Mảng ID nhiều học sinh
 *     responses:
 *       201:
 *         description: Thêm học sinh thành công
 */
router.post('/:classId/students', authorizeRoles('teacher', 'admin'), addStudentToClass);

/**
 * @swagger
 * /api/classes/{classId}/students/{studentId}:
 *   delete:
 *     summary: Xóa học sinh khỏi lớp
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Xóa học sinh thành công
 */
router.delete('/:classId/students/:studentId', authorizeRoles('teacher', 'admin'), removeStudentFromClass);

// ==================== CLASS ASSIGNMENTS ====================

router.get('/:classId/assignments', authorizeRoles('teacher', 'admin'), getAssignmentsByClass);

// ==================== CLASS RESULTS ====================

/**
 * @swagger
 * /api/classes/{classId}/results:
 *   get:
 *     summary: Xem kết quả thi của lớp
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: examId
 *         schema:
 *           type: integer
 *         description: Lọc theo đề thi cụ thể
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [totalScore, submittedAt]
 *           default: totalScore
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Kết quả thi của lớp
 */
router.get('/:classId/results', authorizeRoles('teacher', 'admin'), getClassResults);

module.exports = router;
