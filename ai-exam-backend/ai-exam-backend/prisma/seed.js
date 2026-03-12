const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  
  if (url && url.startsWith('prisma+postgres://')) {
    try {
      const urlObj = new URL(url);
      const apiKey = urlObj.searchParams.get('api_key');
      if (apiKey) {
        const decoded = JSON.parse(Buffer.from(apiKey, 'base64').toString('utf-8'));
        let dbUrl = decoded.databaseUrl;
        dbUrl = dbUrl.replace('localhost', '127.0.0.1');
        return dbUrl;
      }
    } catch (e) {
      console.error('Failed to decode Prisma Postgres URL:', e.message);
    }
  }
  
  return url ? url.replace('localhost', '127.0.0.1') : url;
};

const connectionString = getDatabaseUrl();
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 12;

const defaultUsers = [
  {
    email: 'admin@aiexam.com',
    password: 'Admin@123',
    fullName: 'Quản Trị Viên',
    role: 'admin',
    className: null
  },
  {
    email: 'teacher@aiexam.com',
    password: 'Teacher@123',
    fullName: 'Giáo Viên Demo',
    role: 'teacher',
    className: null
  },
  {
    email: 'student@aiexam.com',
    password: 'Student@123',
    fullName: 'Học Sinh Demo',
    role: 'student',
    className: '12A1'
  }
];

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu...\n');

  for (const userData of defaultUsers) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      console.log(`⏭️  User ${userData.email} đã tồn tại, bỏ qua.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: userData.email,
        passwordHash,
        fullName: userData.fullName,
        role: userData.role,
        className: userData.className,
        isActive: true
      }
    });

    console.log(`✅ Tạo ${userData.role}: ${user.email}`);
  }

  console.log('\n🎉 Seed dữ liệu hoàn tất!');
  console.log('\n📋 Thông tin đăng nhập mặc định:');
  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│  Role     │  Email                │  Password          │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log('│  Admin    │  admin@aiexam.com     │  Admin@123         │');
  console.log('│  Teacher  │  teacher@aiexam.com   │  Teacher@123       │');
  console.log('│  Student  │  student@aiexam.com   │  Student@123       │');
  console.log('└─────────────────────────────────────────────────────────┘');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
