const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Exam System API',
      version: '1.0.0',
      description: 'API documentation cho hệ thống thi trắc nghiệm thông minh AI Exam',
      contact: {
        name: 'AI Graduation Team',
        email: 'support@aigraduation.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Nhập JWT token của bạn'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            fullName: { type: 'string', example: 'Nguyễn Văn A' },
            role: { type: 'string', enum: ['student', 'teacher'], example: 'student' },
            className: { type: 'string', example: '12A1', nullable: true },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'fullName', 'role'],
          properties: {
            email: { type: 'string', format: 'email', example: 'student@example.com' },
            password: { type: 'string', minLength: 6, example: '123456' },
            fullName: { type: 'string', example: 'Nguyễn Văn A' },
            role: { type: 'string', enum: ['student', 'teacher'], example: 'student' },
            className: { type: 'string', example: '12A1', description: 'Bắt buộc nếu role là student' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'student@example.com' },
            password: { type: 'string', example: '123456' }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            message: { type: 'string', example: 'Đăng nhập thành công' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                expiresIn: { type: 'string', example: '15m' }
              }
            }
          }
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword', 'confirmPassword'],
          properties: {
            currentPassword: { type: 'string', example: '123456' },
            newPassword: { type: 'string', minLength: 6, example: 'newpass123' },
            confirmPassword: { type: 'string', example: 'newpass123' }
          }
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' }
          }
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['token', 'newPassword', 'confirmPassword'],
          properties: {
            token: { type: 'string', example: 'abc123def456...' },
            newPassword: { type: 'string', minLength: 6, example: 'newpass123' },
            confirmPassword: { type: 'string', example: 'newpass123' }
          }
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
          }
        },
        UpdateProfileRequest: {
          type: 'object',
          properties: {
            fullName: { type: 'string', example: 'Nguyễn Văn B' },
            className: { type: 'string', example: '12A2', description: 'Chỉ áp dụng cho student' }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            message: { type: 'string' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string', example: 'Lỗi xảy ra' }
          }
        }
      }
    },
    tags: [
      { name: 'Auth', description: 'APIs xác thực người dùng' },
      { name: 'Health', description: 'APIs kiểm tra hệ thống' }
    ]
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
