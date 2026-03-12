const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

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

console.log('📡 Database URL:', connectionString?.substring(0, 50) + '...');
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

const poolConfig = {
  connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false
};

const pool = new Pool(poolConfig);
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: isProduction ? ['error'] : ['error', 'warn'],
});

module.exports = prisma;
