const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message, err.stack);
    process.exit(1);
  });

// Admin Schema
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const Admin = mongoose.model('Admin', adminSchema);

// Function to Create Admin
async function createAdmin() {
  try {
    const username = 'admin'; // Change as needed
    const password = 'admin_password'; // Change to a secure password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      console.log(`❌ Admin with username '${username}' already exists`);
      process.exit(0);
    }

    // Create new admin
    const admin = new Admin({ username, password: hashedPassword });
    await admin.save();
    console.log(`✅ Admin created: ${username}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message, error.stack);
    process.exit(1);
  }
}

// Run the function
createAdmin();