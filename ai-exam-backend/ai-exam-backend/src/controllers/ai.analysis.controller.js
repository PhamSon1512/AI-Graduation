const {
  analyzeStudentPerformance,
  analyzeClassPerformance,
  predictExamScore,
  getOrCreateStudyPlan,
  updateStudyPlan
} = require('../services/ai.analysis.service');

// @desc    Phân tích kết quả cá nhân học sinh
// @route   GET /api/ai/analysis/student/:id
// @access  Student (self) / Teacher / Admin
const getStudentAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const { subjectId } = req.query;
    const userId = req.user.id;
    const role = req.user.role;

    const studentId = parseInt(id);
    if (studentId !== userId && role === 'student') {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn chỉ có thể xem phân tích của chính mình'
      });
    }

    const result = await analyzeStudentPerformance(studentId, subjectId || null);

    res.json({
      status: 'success',
      message: 'Phân tích kết quả cá nhân',
      data: {
        ...result,
        forwardToStudyPlan: true
      }
    });
  } catch (error) {
    console.error('GetStudentAnalysis error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Lỗi server khi phân tích'
    });
  }
};

// @desc    Phân tích kết quả lớp học
// @route   GET /api/ai/analysis/class/:classId
// @access  Teacher (owner)
const getClassAnalysis = async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user.id;

    const prisma = require('../config/prisma');
    const cls = await prisma.class.findFirst({
      where: { id: parseInt(classId), teacherId }
    });

    if (!cls) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy lớp hoặc không có quyền'
      });
    }

    const result = await analyzeClassPerformance(classId);

    res.json({
      status: 'success',
      message: 'Phân tích kết quả lớp',
      data: {
        ...result,
        forwardToTeachingPlan: true
      }
    });
  } catch (error) {
    console.error('GetClassAnalysis error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Lỗi server khi phân tích'
    });
  }
};

// @desc    Dự đoán điểm thi
// @route   GET /api/ai/predict-score
// @access  Student
const getPredictScore = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { subjectId } = req.query;

    const result = await predictExamScore(studentId, subjectId || null);

    res.json({
      status: 'success',
      message: 'Dự đoán điểm thi',
      data: result
    });
  } catch (error) {
    console.error('GetPredictScore error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Lỗi server khi dự đoán'
    });
  }
};

// @desc    Lấy lộ trình học (tạo mới nếu chưa có)
// @route   GET /api/ai/study-plan
// @access  Student
const getStudyPlan = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { subjectId } = req.query;

    const result = await getOrCreateStudyPlan(studentId, subjectId || null);

    res.json({
      status: 'success',
      message: 'Lộ trình học tập',
      data: result
    });
  } catch (error) {
    console.error('GetStudyPlan error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Lỗi server khi lấy lộ trình'
    });
  }
};

// @desc    Cập nhật lộ trình học
// @route   PUT /api/ai/study-plan
// @access  Student
const putStudyPlan = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { title, content, subjectId } = req.body;

    const result = await updateStudyPlan(studentId, {
      title,
      content,
      subjectId
    });

    res.json({
      status: 'success',
      message: 'Đã cập nhật lộ trình học',
      data: result
    });
  } catch (error) {
    console.error('PutStudyPlan error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Lỗi server khi cập nhật'
    });
  }
};

module.exports = {
  getStudentAnalysis,
  getClassAnalysis,
  getPredictScore,
  getStudyPlan,
  putStudyPlan
};
