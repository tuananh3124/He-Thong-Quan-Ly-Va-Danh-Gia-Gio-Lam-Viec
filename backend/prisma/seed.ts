import bcrypt from 'bcryptjs';
import { PrismaClient } from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getEnv } from '@/utils';
import { ACTIVITY_TYPE, ROLE } from '@projectname/shared';

const adapter = new PrismaPg({ connectionString: getEnv('DATABASE_URL') });
const prisma = new PrismaClient({ adapter });

const roundsOfHashing = 10;

async function main() {
  const passwordTest = await bcrypt.hash('Abc123456', roundsOfHashing);

  let tenant = await prisma.tenants.findUnique({
    where: { businessName: 'TEST' },
  });

  if (!tenant) {
    tenant = await prisma.tenants.create({
      data: { businessName: 'TEST' },
    });
  }

  const user = await prisma.users.findUnique({
    where: { email: 'test@test.com' },
  });

  if (!user) {
    await prisma.users.create({
      data: {
        name: 'Test User',
        email: 'test@test.com',
        password: passwordTest,
        tenantId: tenant.id,
        role: ROLE.Staff,
        staffCategory: 'LECTURER',
        academicTitle: 'Giảng viên',
        degree: 'TS',
      },
    });
  } else if (!user.staffCategory) {
    await prisma.users.update({
      where: { id: user.id },
      data: { staffCategory: 'LECTURER' },
    });
  }

  const managerUser = await prisma.users.findUnique({
    where: { email: 'manager@test.com' },
  });

  if (!managerUser) {
    await prisma.users.create({
      data: {
        name: 'Test Manager',
        email: 'manager@test.com',
        password: passwordTest,
        tenantId: tenant.id,
        role: ROLE.Manager,
        managementRole: 'Quản lý đơn vị',
      },
    });
  }

  const adminUser = await prisma.users.findUnique({
    where: { email: 'admin@admin.com' },
  });

  if (!adminUser) {
    await prisma.users.create({
      data: {
        name: 'Admin User',
        email: 'admin@admin.com',
        password: passwordTest,
        role: ROLE.Admin,
      },
    });
  }

  const academicYear = await prisma.academic_years.upsert({
    where: { name: '2025-2026' },
    update: { isActive: true },
    create: {
      name: '2025-2026',
      startDate: new Date('2025-09-01T00:00:00.000Z'),
      endDate: new Date('2026-08-31T23:59:59.000Z'),
      isActive: true,
    },
  });

  const isi = await prisma.publication_classifications.upsert({
    where: { name: 'ISI/SCIE' },
    update: {},
    create: {
      name: 'ISI/SCIE',
      description: 'Tạp chí thuộc danh mục ISI/SCIE',
    },
  });

  const scopus = await prisma.publication_classifications.upsert({
    where: { name: 'SCOPUS' },
    update: {},
    create: {
      name: 'SCOPUS',
      description: 'Tạp chí thuộc danh mục Scopus',
    },
  });

  await prisma.publication_sources.upsert({
    where: { name_classificationId: { name: 'Sample Journal ISI', classificationId: isi.id } },
    update: {},
    create: { name: 'Sample Journal ISI', classificationId: isi.id },
  });

  await prisma.publication_sources.upsert({
    where: { name_classificationId: { name: 'Sample Journal Scopus', classificationId: scopus.id } },
    update: {},
    create: { name: 'Sample Journal Scopus', classificationId: scopus.id },
  });

  const rules = [
    {
      activityType: ACTIVITY_TYPE.RESEARCH,
      classificationId: isi.id,
      academicYearId: academicYear.id,
      hours: 1200,
      priority: 10,
    },
    {
      activityType: ACTIVITY_TYPE.RESEARCH,
      classificationId: scopus.id,
      academicYearId: academicYear.id,
      hours: 800,
      priority: 10,
    },
    {
      activityType: ACTIVITY_TYPE.KNOWLEDGE_TRANSFER,
      academicYearId: academicYear.id,
      hours: 600,
      priority: 5,
    },
  ];

  for (const rule of rules) {
    const exists = await prisma.conversion_rules.findFirst({
      where: {
        activityType: rule.activityType,
        classificationId: rule.classificationId,
        academicYearId: rule.academicYearId,
      },
    });

    if (!exists) await prisma.conversion_rules.create({ data: rule });
  }

  const allocationRules = [
    { roleType: 'MAIN_AUTHOR', percentage: 50, description: 'Tác giả chính' },
    { roleType: 'CO_AUTHOR', percentage: 25, description: 'Đồng tác giả' },
  ];

  for (const allocationRule of allocationRules) {
    const exists = await prisma.author_allocation_rules.findFirst({
      where: { roleType: allocationRule.roleType },
    });
    if (!exists) await prisma.author_allocation_rules.create({ data: allocationRule });
  }

  console.log('Successfully init');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
