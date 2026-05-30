const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashSuperAdmin = await bcrypt.hash('password123', 10);
  const hashZeros = await bcrypt.hash('0000', 10);

  // 1. Create or Update superadmin
  await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: { password: hashSuperAdmin, role: 'HEAD' },
    create: {
      username: 'superadmin',
      password: hashSuperAdmin,
      name: 'Super Admin',
      role: 'HEAD',
      canEditProfile: true,
      canSubmitGrades: true
    }
  });
  console.log("✅ Created/Updated superadmin");

  // 2. Create or Update students
  const studentsToCreate = [
    { u: '66020329', n: 'นักเรียน 66020329' },
    { u: '66020239', n: 'นักเรียน 66020239' },
    { u: '6767', n: 'นักเรียน 6767' },
    { u: '66020217', n: 'นักเรียน 66020217' }
  ];

  const studentIds = {};
  for (const s of studentsToCreate) {
    const st = await prisma.user.upsert({
      where: { username: s.u },
      update: { password: hashZeros, role: 'STUDENT' },
      create: {
        username: s.u,
        password: hashZeros,
        name: s.n,
        role: 'STUDENT',
        level: 'ปวช.1'
      }
    });
    studentIds[s.u] = st.id;
    console.log(`✅ Created/Updated student: ${s.u}`);
  }

  // 3. Update teacher1
  await prisma.user.upsert({
    where: { username: 'teacher1' },
    update: { password: hashZeros, name: 'ครูอังคนา สอนดี' },
    create: {
      username: 'teacher1',
      password: hashZeros,
      name: 'ครูอังคนา สอนดี',
      role: 'TEACHER'
    }
  });
  console.log("✅ Updated teacher1");

  // 4. Create or Update parents
  const parentsToCreate = [
    { u: 'mother1', studentU: '66020329' },
    { u: 'dukdik', studentU: '6767' },
    { u: 'mother2', studentU: '66020217' }
  ];

  for (const p of parentsToCreate) {
    const targetStudentId = studentIds[p.studentU];
    await prisma.user.upsert({
      where: { username: p.u },
      update: { password: hashZeros, studentId: targetStudentId, role: 'PARENT' },
      create: {
        username: p.u,
        password: hashZeros,
        name: `ผู้ปกครองของ ${p.studentU}`,
        role: 'PARENT',
        studentId: targetStudentId
      }
    });
    console.log(`✅ Created/Updated parent: ${p.u} (Linked to ${p.studentU})`);
  }

  console.log("🎉 All specific old users have been restored successfully!");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
