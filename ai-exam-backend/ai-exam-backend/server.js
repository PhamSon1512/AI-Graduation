require("dotenv").config();
require("./src/config/db");
const app = require("./src/app.js");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running at port ${PORT}`);
  console.log(`Current environment: ${process.env.NODE_ENV || "development"}`);
});
