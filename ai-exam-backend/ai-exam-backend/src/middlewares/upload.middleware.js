const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `exam-${uniqueSuffix}${ext}`);
  }
});

const memoryStorage = multer.memoryStorage();

const ALLOWED_MIMES = {
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'application/pdf': 'pdf',
  'application/msword': 'word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word'
};

const examFileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file: JPG, PNG, WebP, GIF, PDF, DOC, DOCX'), false);
  }
};

const uploadExamFiles = multer({
  storage: memoryStorage,
  fileFilter: examFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 10
  }
});

const uploadToDisk = multer({
  storage: storage,
  fileFilter: examFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 10
  }
});

const uploadToMemory = multer({
  storage: memoryStorage,
  fileFilter: examFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File quá lớn. Giới hạn tối đa 20MB mỗi file.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        status: 'error',
        message: 'Tối đa 10 file mỗi lần upload.'
      });
    }
    return res.status(400).json({
      status: 'error',
      message: `Lỗi upload: ${err.message}`
    });
  }
  
  if (err) {
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
  
  next();
};

const getFileType = (mimetype) => {
  return ALLOWED_MIMES[mimetype] || 'unknown';
};

module.exports = {
  uploadToDisk,
  uploadToMemory,
  uploadExamFiles,
  handleMulterError,
  uploadDir,
  getFileType,
  ALLOWED_MIMES
};
