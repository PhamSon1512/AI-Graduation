require("dotenv").config();
require("./src/config/db");
const app = require("./src/app.js");

const PORT = process.env.PORT || 5000;
// Render và nhiều PaaS cần bind 0.0.0.0 để health check thấy cổng
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Server is running at http://${HOST}:${PORT}`);
  console.log(`Current environment: ${process.env.NODE_ENV || "development"}`);
});
