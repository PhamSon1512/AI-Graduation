const prisma = require('./prisma');

const checkConnection = async () => {
  try {
    await prisma.$connect();
    console.log('🔗 Kết nối Database thành công (Prisma)!');
  } catch (err) {
    console.error('❌ Lỗi kết nối Database:', err.message);
  }
};

checkConnection();

module.exports = prisma;