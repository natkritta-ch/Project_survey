const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const adminUsername = "superadmin";

  // ลบบัญชีเดิมทิ้งถ้ามีค้างอยู่ (เพื่อไม่ให้มันจำรหัสผิดพลาด)
  await prisma.user.deleteMany({
    where: { username: adminUsername }
  });

  // สร้างบัญชีใหม่แกะกล่องที่ถูกต้อง 100%
  const newAdmin = await prisma.user.create({
    data: {
      name: "ผู้ดูแลระบบหลัก",
      username: adminUsername,
      password: "password123", // รหัสผ่านง่ายๆ สำหรับทดสอบ
      role: "HEAD", // สิทธิ์ระดับสูงสุด
    }
  });

  console.log("=== สร้างบัญชีใหม่แกะกล่องสำเร็จ! ===");
  console.log("👉 Username:", newAdmin.username);
  console.log("👉 Password:", newAdmin.password);
  console.log("นำข้อมูล 2 บรรทัดนี้ไปเข้าสู่ระบบที่หน้าเว็บได้เลยครับ!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
