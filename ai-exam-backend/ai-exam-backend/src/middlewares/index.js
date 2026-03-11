const { authenticate, authorizeRoles, isTeacher, isStudent } = require('./auth.middleware');

module.exports = {
  authenticate,
  authorizeRoles,
  isTeacher,
  isStudent
};
