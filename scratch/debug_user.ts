import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'กิตติวรรณ' } },
    include: {
      attendances: {
        include: {
          subject: true
        }
      }
    }
  });

  console.log('User:', JSON.stringify(user, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
