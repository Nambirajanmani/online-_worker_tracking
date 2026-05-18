const { connectDB, pool } = require("../config/database");

connectDB()
  .then(() => {
    console.log("Migration completed");
    return pool.end();
  })
  .catch((error) => {
    console.error("Migration failed", error);
    process.exit(1);
  });
