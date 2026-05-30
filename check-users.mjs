import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const users = await p.user.findMany({
  select: { id: true, username: true, role: true, deletedAt: true },
  orderBy: { createdAt: 'desc' },
  take: 20
});
console.log(JSON.stringify(users, null, 2));
await p.$disconnect();
