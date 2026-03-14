const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  toggleSubjectStatus,
  teacherRegisterSubject,
  getTeacherSubjects,
  teacherUnregisterSubject,
  studentEnrollSubject,
  getStudentSubjects,
  studentUnenrollSubject
} = require('../controllers/subject.controller');

/**
 * @swagger
 * tags:
 *   - name: Subjects
 *     description: Quản lý môn học
 *   - name: Teacher Subjects
 *     description: Giáo viên đăng ký môn dạy
 *   - name: Student Subjects
 *     description: Học sinh chọn môn học
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Subject:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         code:
 *           type: string
 *           example: PHYS12
 *         name:
 *           type: string
 *           example: Vật Lý 12
 *         description:
 *           type: string
 *           nullable: true
 *           example: Môn Vật Lý lớp 12
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         stats:
 *           type: object
 *           properties:
 *             totalTeachers:
 *               type: integer
 *             totalStudents:
 *               type: integer
 *     CreateSubjectRequest:
 *       type: object
 *       required:
 *         - code
 *         - name
 *       properties:
 *         code:
 *           type: string
 *           example: PHYS12
 *           description: Mã môn học (unique)
 *         name:
 *           type: string
 *           example: Vật Lý 12
 *         description:
 *           type: string
 *           example: Môn Vật Lý lớp 12
 *     UpdateSubjectRequest:
 *       type: object
 *       properties:
 *         code:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         isActive:
 *           type: boolean
 *     RegisterSubjectRequest:
 *       type: object
 *       required:
 *         - subjectId
 *       properties:
 *         subjectId:
 *           type: integer
 *           example: 1
 */

// All routes require authentication
router.use(authenticate);

// ==================== SUBJECT ROUTES ====================

/**
 * @swagger
 * /api/subjects:
 *   get:
 *     summary: Lấy danh sách môn học
 *     tags: [Subjects]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm theo tên, mã, mô tả
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, name, code]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Danh sách môn học
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     subjects:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Subject'
 *                     pagination:
 *                       type: object
 *   post:
 *     summary: Thêm môn học mới
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSubjectRequest'
 *     responses:
 *       201:
 *         description: Tạo môn học thành công
 *       400:
 *         description: Thiếu thông tin
 *       403:
 *         description: Không có quyền Admin
 *       409:
 *         description: Mã môn học đã tồn tại
 */
router.route('/subjects')
  .get(getAllSubjects)
  .post(authorizeRoles('admin'), createSubject);

/**
 * @swagger
 * /api/subjects/{id}:
 *   get:
 *     summary: Xem chi tiết môn học
 *     tags: [Subjects]
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
 *         description: Chi tiết môn học
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Subject'
 *       404:
 *         description: Không tìm thấy môn học
 *   put:
 *     summary: Cập nhật môn học
 *     tags: [Subjects]
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
 *             $ref: '#/components/schemas/UpdateSubjectRequest'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không có quyền Admin
 *       404:
 *         description: Không tìm thấy môn học
 */
router.route('/subjects/:id')
  .get(getSubjectById)
  .put(authorizeRoles('admin'), updateSubject);

/**
 * @swagger
 * /api/subjects/{id}/status:
 *   patch:
 *     summary: Ẩn / Hiện môn học
 *     tags: [Subjects]
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
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Thay đổi trạng thái thành công
 *       403:
 *         description: Không có quyền Admin
 *       404:
 *         description: Không tìm thấy môn học
 */
router.patch('/subjects/:id/status', authorizeRoles('admin'), toggleSubjectStatus);

// ==================== TEACHER SUBJECT ROUTES ====================

/**
 * @swagger
 * /api/teachers/{id}/subjects:
 *   get:
 *     summary: Lấy danh sách môn dạy của giáo viên
 *     tags: [Teacher Subjects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của giáo viên
 *     responses:
 *       200:
 *         description: Danh sách môn dạy
 *       403:
 *         description: Không có quyền
 *   post:
 *     summary: Giáo viên đăng ký môn dạy
 *     tags: [Teacher Subjects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của giáo viên
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterSubjectRequest'
 *     responses:
 *       201:
 *         description: Đăng ký môn dạy thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy giáo viên hoặc môn học
 *       409:
 *         description: Đã đăng ký môn này
 */
router.route('/teachers/:id/subjects')
  .get(authorizeRoles('teacher', 'admin'), getTeacherSubjects)
  .post(authorizeRoles('teacher', 'admin'), teacherRegisterSubject);

/**
 * @swagger
 * /api/teachers/{id}/subjects/{subjectId}:
 *   delete:
 *     summary: Giáo viên hủy đăng ký môn dạy
 *     tags: [Teacher Subjects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của giáo viên
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của môn học
 *     responses:
 *       200:
 *         description: Hủy đăng ký thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy đăng ký
 */
router.delete('/teachers/:id/subjects/:subjectId', authorizeRoles('teacher', 'admin'), teacherUnregisterSubject);

// ==================== STUDENT SUBJECT ROUTES ====================

/**
 * @swagger
 * /api/students/{id}/subjects:
 *   get:
 *     summary: Lấy danh sách môn học của học sinh
 *     tags: [Student Subjects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của học sinh
 *     responses:
 *       200:
 *         description: Danh sách môn học
 *       403:
 *         description: Không có quyền
 *   post:
 *     summary: Học sinh chọn môn học
 *     tags: [Student Subjects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của học sinh
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterSubjectRequest'
 *     responses:
 *       201:
 *         description: Đăng ký môn học thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy học sinh hoặc môn học
 *       409:
 *         description: Đã đăng ký môn này
 */
router.route('/students/:id/subjects')
  .get(authorizeRoles('student', 'teacher', 'admin'), getStudentSubjects)
  .post(authorizeRoles('student', 'admin'), studentEnrollSubject);

/**
 * @swagger
 * /api/students/{id}/subjects/{subjectId}:
 *   delete:
 *     summary: Học sinh hủy đăng ký môn học
 *     tags: [Student Subjects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của học sinh
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của môn học
 *     responses:
 *       200:
 *         description: Hủy đăng ký thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy đăng ký
 */
router.delete('/students/:id/subjects/:subjectId', authorizeRoles('student', 'admin'), studentUnenrollSubject);

module.exports = router;
