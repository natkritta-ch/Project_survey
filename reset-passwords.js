const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('123456', 10);
  await prisma.user.updateMany({
    data: { password: hash }
  });
  console.log("All passwords reset to 123456");
}

main().finally(() => prisma.$disconnect());
