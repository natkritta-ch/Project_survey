const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ เชื่อมต่อ Database สำเร็จ!');
    
    // Check if user table exists and get count
    const count = await prisma.user.count();
    console.log(`จำนวนผู้ใช้ในระบบปัจจุบัน: ${count} คน`);
    
    // If 0 users, let's create a default admin to test login
    if (count === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      await prisma.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          name: 'Administrator',
          role: 'HEAD',
          canEditProfile: true,
          canSubmitGrades: true
        }
      });
      console.log('✅ สร้างบัญชีผู้ใช้เริ่มต้นสำเร็จ:');
      console.log('Username: admin');
      console.log('Password: 123456');
    }

  } catch (error) {
    console.error('❌ เชื่อมต่อไม่สำเร็จ:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
