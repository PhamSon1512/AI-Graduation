const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser
} = require('../controllers/admin.user.controller');

router.use(authenticate);
router.use(authorizeRoles('admin'));

/**
 * @swagger
 * tags:
 *   name: Admin - Users
 *   description: Quản lý người dùng (chỉ Admin)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminUserResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         email:
 *           type: string
 *           example: user@example.com
 *         fullName:
 *           type: string
 *           example: Nguyễn Văn A
 *         role:
 *           type: string
 *           enum: [student, teacher, admin]
 *           example: student
 *         className:
 *           type: string
 *           nullable: true
 *           example: 12A1
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
 *             totalExamsTaken:
 *               type: integer
 *             totalExamsCreated:
 *               type: integer
 *             totalQuestionsCreated:
 *               type: integer
 *     CreateUserRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - fullName
 *         - role
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: newuser@example.com
 *         password:
 *           type: string
 *           minLength: 6
 *           example: password123
 *         fullName:
 *           type: string
 *           example: Nguyễn Văn B
 *         role:
 *           type: string
 *           enum: [student, teacher, admin]
 *           example: student
 *         className:
 *           type: string
 *           description: Bắt buộc nếu role là student
 *           example: 12A1
 *         isActive:
 *           type: boolean
 *           default: true
 *     UpdateUserRequest:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 6
 *         fullName:
 *           type: string
 *         role:
 *           type: string
 *           enum: [student, teacher, admin]
 *         className:
 *           type: string
 *         isActive:
 *           type: boolean
 *     ToggleStatusRequest:
 *       type: object
 *       required:
 *         - isActive
 *       properties:
 *         isActive:
 *           type: boolean
 *           example: false
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Lấy danh sách người dùng
 *     description: Lấy danh sách tất cả người dùng với phân trang, tìm kiếm và lọc
 *     tags: [Admin - Users]
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
 *           default: 10
 *         description: Số lượng kết quả mỗi trang
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên, email hoặc lớp
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [student, teacher, admin]
 *         description: Lọc theo role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Lọc theo trạng thái hoạt động
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, fullName, email, role]
 *           default: createdAt
 *         description: Sắp xếp theo trường
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Thứ tự sắp xếp
 *     responses:
 *       200:
 *         description: Danh sách người dùng
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
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AdminUserResponse'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalCount:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền Admin
 *   post:
 *     summary: Tạo người dùng mới
 *     description: Admin tạo một người dùng mới
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: Tạo người dùng thành công
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
 *                   example: Tạo người dùng thành công
 *                 data:
 *                   $ref: '#/components/schemas/AdminUserResponse'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền Admin
 *       409:
 *         description: Email đã tồn tại
 */
router.route('/')
  .get(getAllUsers)
  .post(createUser);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Xem chi tiết người dùng
 *     description: Lấy thông tin chi tiết của một người dùng theo ID
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của người dùng
 *     responses:
 *       200:
 *         description: Thông tin chi tiết người dùng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/AdminUserResponse'
 *                     - type: object
 *                       properties:
 *                         recentExamResults:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               totalScore:
 *                                 type: number
 *                               submittedAt:
 *                                 type: string
 *                                 format: date-time
 *                               exam:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: integer
 *                                   title:
 *                                     type: string
 *                         recentCreatedExams:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               title:
 *                                 type: string
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *       400:
 *         description: ID không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền Admin
 *       404:
 *         description: Không tìm thấy người dùng
 *   put:
 *     summary: Cập nhật người dùng
 *     description: Cập nhật thông tin người dùng theo ID
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của người dùng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
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
 *                   example: Cập nhật người dùng thành công
 *                 data:
 *                   $ref: '#/components/schemas/AdminUserResponse'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền Admin
 *       404:
 *         description: Không tìm thấy người dùng
 *       409:
 *         description: Email đã tồn tại
 *   delete:
 *     summary: Xóa người dùng (soft delete)
 *     description: Xóa mềm người dùng theo ID (dữ liệu vẫn được lưu trong database)
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của người dùng
 *     responses:
 *       200:
 *         description: Xóa thành công
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
 *                   example: Xóa người dùng thành công
 *       400:
 *         description: ID không hợp lệ hoặc không thể xóa chính mình
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền Admin
 *       404:
 *         description: Không tìm thấy người dùng
 */
router.route('/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(deleteUser);

/**
 * @swagger
 * /api/admin/users/{id}/status:
 *   patch:
 *     summary: Khóa / Mở khóa người dùng
 *     description: Thay đổi trạng thái hoạt động của người dùng
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của người dùng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ToggleStatusRequest'
 *     responses:
 *       200:
 *         description: Thay đổi trạng thái thành công
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
 *                   example: Khóa tài khoản thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     email:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                     role:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: ID không hợp lệ hoặc không thể thay đổi trạng thái chính mình
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền Admin
 *       404:
 *         description: Không tìm thấy người dùng
 */
router.patch('/:id/status', toggleUserStatus);

module.exports = router;
