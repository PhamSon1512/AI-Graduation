const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');
const {
  getTopics,
  getTopicById,
  createTopic,
  updateTopic,
  deleteTopic
} = require('../controllers/topic.controller');

/**
 * @swagger
 * tags:
 *   - name: Topics
 *     description: Quản lý chủ đề (topic) thuộc môn học
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Topic:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         subjectId:
 *           type: integer
 *           example: 1
 *         code:
 *           type: string
 *           example: dao_dong_co
 *         name:
 *           type: string
 *           example: Dao động cơ
 *         description:
 *           type: string
 *           nullable: true
 *         orderNumber:
 *           type: integer
 *           example: 1
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         subject:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             code:
 *               type: string
 *             name:
 *               type: string
 *     CreateTopicRequest:
 *       type: object
 *       required:
 *         - subjectId
 *         - code
 *         - name
 *       properties:
 *         subjectId:
 *           type: integer
 *           example: 1
 *         code:
 *           type: string
 *           example: dao_dong_co
 *         name:
 *           type: string
 *           example: Dao động cơ
 *         description:
 *           type: string
 *         orderNumber:
 *           type: integer
 *           example: 1
 *     UpdateTopicRequest:
 *       type: object
 *       properties:
 *         code:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         orderNumber:
 *           type: integer
 *         isActive:
 *           type: boolean
 */

// Tất cả routes yêu cầu đăng nhập
router.use(authenticate);

/**
 * @swagger
 * /api/topics:
 *   get:
 *     summary: Lấy danh sách topic
 *     description: Lấy danh sách topic, có thể lọc theo môn học (subjectId)
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: integer
 *         description: Lọc topic theo môn học
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên, mã
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Danh sách topic
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
 *                     topics:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Topic'
 *                     pagination:
 *                       type: object
 */
router.get('/', getTopics);

/**
 * @swagger
 * /api/topics:
 *   post:
 *     summary: Thêm topic
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTopicRequest'
 *     responses:
 *       201:
 *         description: Thêm thành công
 *       400:
 *         description: Thiếu thông tin
 *       403:
 *         description: Chỉ Teacher/Admin
 *       409:
 *         description: Mã topic đã tồn tại
 */
router.post('/', authorizeRoles('teacher', 'admin'), createTopic);

/**
 * @swagger
 * /api/topics/{id}:
 *   get:
 *     summary: Xem chi tiết topic
 *     tags: [Topics]
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
 *         description: Chi tiết topic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Topic'
 *       404:
 *         description: Không tìm thấy topic
 *   put:
 *     summary: Cập nhật topic
 *     tags: [Topics]
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
 *             $ref: '#/components/schemas/UpdateTopicRequest'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Chỉ Teacher/Admin
 *       404:
 *         description: Không tìm thấy topic
 *   delete:
 *     summary: Xóa topic
 *     tags: [Topics]
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
 *       403:
 *         description: Chỉ Admin
 *       404:
 *         description: Không tìm thấy topic
 */
router.route('/:id')
  .get(getTopicById)
  .put(authorizeRoles('teacher', 'admin'), updateTopic)
  .delete(authorizeRoles('admin'), deleteTopic);

module.exports = router;
