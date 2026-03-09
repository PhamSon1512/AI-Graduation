const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Cấu hình ssl quan trọng khi deploy lên các cloud database (như Supabase, Neon)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Lỗi kết nối Database:', err.message);
  } else {
    console.log('🔗 Kết nối PostgreSQL thành công!');
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};