const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const users = await p.user.findMany({
    where: { username: { contains: 'mother' } },
    select: { id: true, username: true, password: true, role: true, deletedAt: true, name: true }
  });
  console.log("Users with 'mother' in username:");
  console.log(JSON.stringify(users, null, 2));
  
  // Also check all PARENT role users
  const parents = await p.user.findMany({
    where: { role: 'PARENT' },
    select: { id: true, username: true, password: true, role: true, deletedAt: true, name: true }
  });
  console.log("\nAll PARENT role users:");
  console.log(JSON.stringify(parents, null, 2));
  
  await p.$disconnect();
}

main().catch(e => { console.error(e); p.$disconnect(); });
