/**
 * Seed script to create or update the configured admin accounts.
 * Credentials must be supplied through the ADMIN1_* and ADMIN2_* variables.
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Admin = require("../models/Admin");

dotenv.config();

function validateCredential(label, email, password) {
  if (!email || !password) {
    throw new Error(`${label} email and password must be configured.`);
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error(`${label} email is invalid.`);
  }
  if (password.length < 12) {
    throw new Error(`${label} password must be at least 12 characters.`);
  }

  return { email: normalizedEmail, password };
}

async function seed() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI must be configured.");
    }

    const admins = [
      { name: "Admin 1", ...validateCredential("ADMIN1", process.env.ADMIN1_email, process.env.ADMIN1_pass) },
      { name: "Admin 2", ...validateCredential("ADMIN2", process.env.ADMIN2_email, process.env.ADMIN2_pass) },
    ];
    if (new Set(admins.map((admin) => admin.email)).size !== admins.length) {
      throw new Error("ADMIN1 and ADMIN2 must use different email addresses.");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    for (const adminData of admins) {
      let admin = await Admin.findOne({ email: adminData.email });
      if (!admin) {
        admin = new Admin(adminData);
      } else {
        admin.name = adminData.name;
        admin.password = adminData.password;
      }
      await admin.save();
      console.log(`✅ Updated admin: ${adminData.email}`);
    }

    await Admin.deleteMany({
      email: {
        $in: ["admin1@urja.com", "admin2@urja.com"],
        $nin: admins.map((admin) => admin.email),
      },
    });

    console.log("\n🎉 Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
}

seed();
