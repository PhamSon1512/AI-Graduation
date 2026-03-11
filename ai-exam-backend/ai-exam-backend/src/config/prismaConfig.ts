/**
 * File này để cấu hình prisma client, giúp kết nối với database và thực hiện các thao tác CRUD.
 * Bạn có thể import prisma client từ file này để sử dụng trong các phần khác của ứng dụng.
 * Ví dụ: const prisma = require('./config/prismaConfig');
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = prisma;

/* VÍ DỤ SỬ DỤNG PRISMA CLIENT TRONG FILE KHÁC:

const prisma = require("../config/prisma");

async function getUsers() {
  return await prisma.user.findMany();
}
  */
