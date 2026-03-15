const prisma = require('../config/prisma');

// @desc    Lấy danh sách topic (có filter theo subjectId)
// @route   GET /api/topics
// @access  All (authenticated)
const getTopics = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      subjectId,
      search = '',
      isActive,
      sortBy = 'orderNumber',
      sortOrder = 'asc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 50);
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (subjectId) {
      where.subjectId = parseInt(subjectId);
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const orderBy = {};
    const validSortFields = ['createdAt', 'name', 'code', 'orderNumber'];
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.orderNumber = 'asc';
    }

    const [topics, totalCount] = await Promise.all([
      prisma.topic.findMany({
        where,
        include: {
          subject: {
            select: { id: true, code: true, name: true }
          }
        },
        orderBy,
        skip,
        take: limitNum
      }),
      prisma.topic.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      status: 'success',
      data: {
        topics,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('GetTopics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi lấy danh sách topic'
    });
  }
};

// @desc    Xem chi tiết topic
// @route   GET /api/topics/:id
// @access  All (authenticated)
const getTopicById = async (req, res) => {
  try {
    const { id } = req.params;
    const topicId = parseInt(id);

    if (isNaN(topicId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID không hợp lệ'
      });
    }

    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        subject: {
          select: { id: true, code: true, name: true, description: true }
        }
      }
    });

    if (!topic) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy topic'
      });
    }

    res.json({
      status: 'success',
      data: topic
    });
  } catch (error) {
    console.error('GetTopicById error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi lấy chi tiết topic'
    });
  }
};

// @desc    Thêm topic
// @route   POST /api/topics
// @access  Teacher / Admin
const createTopic = async (req, res) => {
  try {
    const { subjectId, code, name, description, orderNumber } = req.body;

    if (!subjectId || !code || !name) {
      return res.status(400).json({
        status: 'error',
        message: 'Thiếu thông tin: subjectId, code, name là bắt buộc'
      });
    }

    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(subjectId) }
    });

    if (!subject) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy môn học'
      });
    }

    const existing = await prisma.topic.findUnique({
      where: {
        subjectId_code: {
          subjectId: parseInt(subjectId),
          code: code.trim()
        }
      }
    });

    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: `Mã topic "${code}" đã tồn tại trong môn học này`
      });
    }

    const topic = await prisma.topic.create({
      data: {
        subjectId: parseInt(subjectId),
        code: code.trim(),
        name: name.trim(),
        description: description?.trim() || null,
        orderNumber: parseInt(orderNumber) || 0
      },
      include: {
        subject: {
          select: { id: true, code: true, name: true }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Thêm topic thành công',
      data: topic
    });
  } catch (error) {
    console.error('CreateTopic error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi thêm topic'
    });
  }
};

// @desc    Cập nhật topic
// @route   PUT /api/topics/:id
// @access  Teacher / Admin
const updateTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, description, orderNumber, isActive } = req.body;
    const topicId = parseInt(id);

    if (isNaN(topicId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID không hợp lệ'
      });
    }

    const existing = await prisma.topic.findUnique({
      where: { id: topicId }
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy topic'
      });
    }

    const updateData = {};

    if (code !== undefined) updateData.code = code.trim();
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (orderNumber !== undefined) updateData.orderNumber = parseInt(orderNumber) ?? existing.orderNumber;
    if (isActive !== undefined) updateData.isActive = isActive === true || isActive === 'true';

    if (code && code !== existing.code) {
      const duplicate = await prisma.topic.findUnique({
        where: {
          subjectId_code: {
            subjectId: existing.subjectId,
            code: code.trim()
          }
        }
      });
      if (duplicate) {
        return res.status(409).json({
          status: 'error',
          message: `Mã topic "${code}" đã tồn tại trong môn học này`
        });
      }
    }

    const topic = await prisma.topic.update({
      where: { id: topicId },
      data: updateData,
      include: {
        subject: {
          select: { id: true, code: true, name: true }
        }
      }
    });

    res.json({
      status: 'success',
      message: 'Cập nhật topic thành công',
      data: topic
    });
  } catch (error) {
    console.error('UpdateTopic error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi cập nhật topic'
    });
  }
};

// @desc    Xóa topic
// @route   DELETE /api/topics/:id
// @access  Admin only
const deleteTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const topicId = parseInt(id);

    if (isNaN(topicId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID không hợp lệ'
      });
    }

    const existing = await prisma.topic.findUnique({
      where: { id: topicId }
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy topic'
      });
    }

    await prisma.topic.delete({
      where: { id: topicId }
    });

    res.json({
      status: 'success',
      message: 'Xóa topic thành công'
    });
  } catch (error) {
    console.error('DeleteTopic error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi xóa topic'
    });
  }
};

module.exports = {
  getTopics,
  getTopicById,
  createTopic,
  updateTopic,
  deleteTopic
};
