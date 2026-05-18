const { connectDB, pool } = require("../config/database");
const User = require("../models/User");

async function seedDatabase() {
  try {
    await connectDB();

    // Create dummy admin user
    const adminExists = await User.findByEmail("admin@example.com");
    if (!adminExists) {
      await User.create({
        email: "admin@example.com",
        password: "Admin@123",
        role: "admin"
      });
      console.log("✓ Admin user created: admin@example.com / Admin@123");
    } else {
      console.log("✓ Admin user already exists");
    }

    // Create dummy employee user
    const employeeExists = await User.findByEmail("employee@example.com");
    if (!employeeExists) {
      await User.create({
        email: "employee@example.com",
        password: "Employee@123",
        role: "employee"
      });
      console.log("✓ Employee user created: employee@example.com / Employee@123");
    } else {
      console.log("✓ Employee user already exists");
    }

    console.log("\nSeed completed successfully!");
    console.log("\n📝 Dummy Credentials:");
    console.log("Admin:    admin@example.com / Admin@123");
    console.log("Employee: employee@example.com / Employee@123");
  } catch (error) {
    console.error("Seed failed", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();
