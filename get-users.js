const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log("=== บัญชีในระบบตอนนี้ ===");
  users.forEach(u => {
    console.log(`Username: ${u.username} | Role: ${u.role} | Name: ${u.name}`);
  });
}

main().finally(() => prisma.$disconnect());
