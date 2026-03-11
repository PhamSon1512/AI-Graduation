const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@aigraduation.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const sendPasswordResetEmail = async (email, resetToken, fullName) => {
  const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

  try {
    const { data, error } = await resend.emails.send({
      from: `AI Exam System <${EMAIL_FROM}>`,
      to: email,
      subject: 'Yêu cầu đặt lại mật khẩu - AI Exam',
      html: `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Đặt lại mật khẩu</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎓 AI Exam System</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">Hệ thống thi trắc nghiệm thông minh</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #333; margin-top: 0;">Xin chào ${fullName || 'bạn'},</h2>
              
              <p style="color: #555; line-height: 1.6; font-size: 15px;">
                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. 
                Nhấn vào nút bên dưới để tạo mật khẩu mới:
              </p>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="${resetLink}" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: #ffffff; text-decoration: none; padding: 15px 40px; 
                          border-radius: 8px; font-weight: 600; font-size: 16px;
                          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                  🔐 Đặt lại mật khẩu
                </a>
              </div>
              
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin: 25px 0;">
                <p style="color: #856404; margin: 0; font-size: 14px;">
                  ⚠️ <strong>Lưu ý:</strong> Link này sẽ hết hạn sau <strong>1 giờ</strong>.
                </p>
              </div>
              
              <p style="color: #555; line-height: 1.6; font-size: 14px;">
                Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. 
                Tài khoản của bạn vẫn an toàn.
              </p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="color: #999; font-size: 12px; margin-bottom: 0;">
                Nếu nút không hoạt động, sao chép và dán link sau vào trình duyệt:<br>
                <a href="${resetLink}" style="color: #667eea; word-break: break-all;">${resetLink}</a>
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #999; margin: 0; font-size: 12px;">
                © 2024 AI Exam System. All rights reserved.<br>
                Email này được gửi tự động, vui lòng không trả lời.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error('Không thể gửi email');
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

const sendWelcomeEmail = async (email, fullName) => {
  try {
    const { data, error } = await resend.emails.send({
      from: `AI Exam System <${EMAIL_FROM}>`,
      to: email,
      subject: 'Chào mừng bạn đến với AI Exam System! 🎓',
      html: `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎓 AI Exam System</h1>
            </div>
            
            <div style="padding: 40px 30px;">
              <h2 style="color: #333; margin-top: 0;">Chào mừng ${fullName}! 🎉</h2>
              
              <p style="color: #555; line-height: 1.6; font-size: 15px;">
                Cảm ơn bạn đã đăng ký tài khoản tại AI Exam System - Hệ thống thi trắc nghiệm 
                thông minh ứng dụng AI để phân tích và cải thiện kết quả học tập.
              </p>
              
              <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1976d2; margin-top: 0;">🚀 Bạn có thể:</h3>
                <ul style="color: #555; line-height: 1.8;">
                  <li>Làm bài thi trắc nghiệm online</li>
                  <li>Nhận phân tích điểm mạnh/yếu từ AI</li>
                  <li>Theo dõi tiến độ học tập</li>
                  <li>Nhận đề xuất ôn tập cá nhân hóa</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${FRONTEND_URL}/login" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: #ffffff; text-decoration: none; padding: 15px 40px; 
                          border-radius: 8px; font-weight: 600;">
                  Bắt đầu ngay →
                </a>
              </div>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #999; margin: 0; font-size: 12px;">
                © 2024 AI Exam System. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Welcome email error:', error);
    return { success: false };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail
};
