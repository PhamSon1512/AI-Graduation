require('dotenv').config();
require('./src/config/db');
const app = require('./src/app.js');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log(`🌍 Môi trường hiện tại: ${process.env.NODE_ENV || 'development'}`);
});