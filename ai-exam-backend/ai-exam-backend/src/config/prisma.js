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
        // Fix IPv6 issue on Windows - force IPv4
        dbUrl = dbUrl.replace('localhost', '127.0.0.1');
        return dbUrl;
      }
    } catch (e) {
      console.error('Failed to decode Prisma Postgres URL:', e.message);
    }
  }
  
  // Also fix for regular URLs
  return url ? url.replace('localhost', '127.0.0.1') : url;
};

const connectionString = getDatabaseUrl();
console.log('📡 Database URL:', connectionString?.substring(0, 50) + '...');

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

module.exports = prisma;
