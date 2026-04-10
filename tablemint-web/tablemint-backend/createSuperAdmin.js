// createSuperAdmin.js  (Place this in tablemint-backend root)

const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

// ✅ Correct path - models are inside src/
const User = require('./src/models/User');

dotenv.config({ path: path.join(__dirname, '.env') });

const createSuperAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.DATABASE);

        console.log('✅ Connected to MongoDB');

        // Check if superadmin already exists
        const existing = await User.findOne({ role: 'superadmin' });
        if (existing) {
            console.log('⚠️ SuperAdmin already exists:');
            console.log('   Email →', existing.email);
            await mongoose.disconnect();
            return;
        }

        // Create SuperAdmin
        const superadmin = await User.create({
            name: 'Super Admin',
            email: 'superadmin@tablemint.com',
            password: 'superadmin123',     // Change this after login!
            role: 'superadmin',
            isActive: true,
            isVerified: true,           // No email OTP needed — created from terminal
            phone: '9876543210'
        });

        console.log('\n🎉 SuperAdmin Created Successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Email     :  superadmin@tablemint.com');
        console.log('Password  :  superadmin123');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n⚠️  Please login and change the password immediately.');

    } catch (err) {
        console.error('\n❌ Error:');
        console.error(err.message);

        if (err.code === 11000) {
            console.error('Duplicate key error - SuperAdmin may already exist.');
        }
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

createSuperAdmin();