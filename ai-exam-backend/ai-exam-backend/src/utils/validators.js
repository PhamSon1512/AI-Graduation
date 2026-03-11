const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return {
      valid: false,
      message: 'Mật khẩu phải có ít nhất 6 ký tự'
    };
  }
  return { valid: true };
};

const sanitizeUser = (user) => {
  const { passwordHash, resetToken, resetTokenExpiry, refreshToken, ...safeUser } = user;
  return safeUser;
};

module.exports = {
  validateEmail,
  validatePassword,
  sanitizeUser
};
