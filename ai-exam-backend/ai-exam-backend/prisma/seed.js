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

const defaultSubjects = [
  {
    code: 'PHYS12',
    name: 'Vật Lý 12',
    description: 'Môn Vật Lý lớp 12 - Chương trình THPT'
  },
  {
    code: 'CHEM12',
    name: 'Hóa Học 12',
    description: 'Môn Hóa Học lớp 12 - Chương trình THPT'
  },
  {
    code: 'MATH12',
    name: 'Toán 12',
    description: 'Môn Toán lớp 12 - Chương trình THPT'
  },
  {
    code: 'BIO12',
    name: 'Sinh Học 12',
    description: 'Môn Sinh Học lớp 12 - Chương trình THPT'
  },
  {
    code: 'ENG12',
    name: 'Tiếng Anh 12',
    description: 'Môn Tiếng Anh lớp 12 - Chương trình THPT'
  }
];

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu...\n');

  for (const userData of defaultUsers) {
    const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        passwordHash,
        fullName: userData.fullName,
        role: userData.role,
        className: userData.className,
        isActive: true,
        deletedAt: null
      },
      create: {
        email: userData.email,
        passwordHash,
        fullName: userData.fullName,
        role: userData.role,
        className: userData.className,
        isActive: true
      }
    });

    console.log(`✅ Upsert ${userData.role}: ${user.email} (ID: ${user.id})`);
  }

  // Hiển thị tất cả users trong database
  const allUsers = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, email: true, fullName: true, role: true }
  });
  
  console.log('\n📊 Danh sách users trong database:');
  allUsers.forEach(u => {
    console.log(`   ID: ${u.id} | ${u.role.padEnd(7)} | ${u.email}`);
  });

  // Seed subjects
  console.log('\n📚 Seed môn học...');
  for (const subjectData of defaultSubjects) {
    const subject = await prisma.subject.upsert({
      where: { code: subjectData.code },
      update: {
        name: subjectData.name,
        description: subjectData.description,
        isActive: true
      },
      create: {
        code: subjectData.code,
        name: subjectData.name,
        description: subjectData.description,
        isActive: true
      }
    });
    console.log(`✅ Upsert subject: ${subject.code} - ${subject.name}`);
  }

  // Hiển thị tất cả subjects
  const allSubjects = await prisma.subject.findMany({
    select: { id: true, code: true, name: true, isActive: true }
  });
  
  console.log('\n📊 Danh sách môn học trong database:');
  allSubjects.forEach(s => {
    console.log(`   ID: ${s.id} | ${s.code.padEnd(8)} | ${s.name} | ${s.isActive ? 'Active' : 'Hidden'}`);
  });

  // Seed topics cho Vật Lý 12
  const physicsSubject = await prisma.subject.findUnique({ where: { code: 'PHYS12' } });
  if (physicsSubject) {
    const defaultTopics = [
      { code: 'dao_dong_co', name: 'Dao động cơ', orderNumber: 1 },
      { code: 'song_co', name: 'Sóng cơ', orderNumber: 2 },
      { code: 'dien_xoay_chieu', name: 'Dòng điện xoay chiều', orderNumber: 3 },
      { code: 'song_anh_sang', name: 'Sóng ánh sáng', orderNumber: 4 },
      { code: 'luong_tu_anh_sang', name: 'Lượng tử ánh sáng', orderNumber: 5 },
      { code: 'vat_ly_hat_nhan', name: 'Vật lý hạt nhân', orderNumber: 6 }
    ];
    for (const t of defaultTopics) {
      await prisma.topic.upsert({
        where: {
          subjectId_code: { subjectId: physicsSubject.id, code: t.code }
        },
        update: { name: t.name, orderNumber: t.orderNumber },
        create: {
          subjectId: physicsSubject.id,
          code: t.code,
          name: t.name,
          orderNumber: t.orderNumber
        }
      });
    }
    console.log(`\n✅ Seed ${defaultTopics.length} topics cho Vật Lý 12`);
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
