import bcrypt from 'bcryptjs';
import { PrismaClient } from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getEnv } from '@/utils';
import { ACTIVITY_TYPE, ROLE } from '@projectname/shared';

const adapter = new PrismaPg({ connectionString: getEnv('DATABASE_URL') });
const prisma = new PrismaClient({ adapter });

const roundsOfHashing = 10;

const spreadsheetStaff = [
  { name: 'Phạm Hồng Tung', email: 'pham.hong.tung@example.test', academicTitle: 'GVCC hạng 1', degree: 'GS', staffCategory: 'LECTURER' },
  { name: 'Nguyễn Quang Ngọc', email: 'nguyen.quang.ngoc@example.test', academicTitle: 'GVCC hạng 1', degree: 'GS', staffCategory: 'LECTURER' },
  { name: 'Trương Quang Hải', email: 'truong.quang.hai@example.test', academicTitle: 'GVCC hạng 1', degree: 'GS', staffCategory: 'LECTURER' },
  { name: 'Nguyễn Thị Việt Thanh', email: 'nguyen.thi.viet.thanh@example.test', academicTitle: 'GVCC hạng 1', degree: 'PGS', staffCategory: 'LECTURER' },
  { name: 'Vũ Kim Chi', email: 'vu.kim.chi@example.test', academicTitle: 'GVC hạng II', degree: 'TS', staffCategory: 'LECTURER' },
  { name: 'Trần Thanh Hà', email: 'tran.thanh.ha@example.test', academicTitle: 'GV hạng III', degree: 'TS', staffCategory: 'LECTURER' },
  { name: 'Lê Đình Tân', email: 'le.dinh.tan@example.test', academicTitle: 'GV hạng III', degree: 'TS', staffCategory: 'LECTURER' },
  { name: 'Phạm Văn Lợi', email: 'pham.van.loi@example.test', academicTitle: 'NVC hạng II', degree: 'PGS', staffCategory: 'RESEARCHER' },
  { name: 'Bùi Văn Tuấn', email: 'bui.van.tuan@example.test', academicTitle: 'NVC hạng III', degree: 'TS', staffCategory: 'RESEARCHER' },
  { name: 'Phùng Thị Thanh Lâm', email: 'phung.thi.thanh.lam@example.test', academicTitle: 'NCV hạng II', degree: 'TS', staffCategory: 'RESEARCHER' },
  { name: 'Nguyễn Thị Huệ', email: 'nguyen.thi.hue@example.test', academicTitle: 'NCV hạng III', degree: 'TS', staffCategory: 'RESEARCHER' },
  { name: 'Vũ Đường Luân', email: 'vu.duong.luan@example.test', academicTitle: 'NCV hạng III', degree: 'ThS', staffCategory: 'RESEARCHER' },
  { name: 'Tống Văn Lợi', email: 'tong.van.loi@example.test', academicTitle: 'NCV hạng III', degree: 'ThS', staffCategory: 'RESEARCHER' },
  { name: 'Đặng Ngọc Hà', email: 'dang.ngoc.ha@example.test', academicTitle: 'NCV hạng III', degree: 'ThS', staffCategory: 'RESEARCHER' },
  { name: 'Phạm Th. Thương Thương', email: 'pham.th.thuong.thuong@example.test', academicTitle: 'NCV hạng II', degree: 'ThS', staffCategory: 'RESEARCHER' },
  { name: 'Giang Văn Trọng', email: 'giang.van.trong@example.test', academicTitle: 'NCV hạng III', degree: 'ThS', staffCategory: 'RESEARCHER' },
  { name: 'Nguyễn Đức Minh', email: 'nguyen.duc.minh@example.test', academicTitle: 'NCV hạng III', degree: 'ThS', staffCategory: 'RESEARCHER' },
  { name: 'Nguyễn Quang Anh', email: 'nguyen.quang.anh@example.test', academicTitle: 'NCV hạng III', degree: 'ThS', staffCategory: 'RESEARCHER' },
  { name: 'Trần Thị Lan', email: 'tran.thi.lan@example.test', academicTitle: 'NCV hạng III', degree: 'ThS', staffCategory: 'RESEARCHER' },
  { name: 'Nguyễn Dương Liễu', email: 'nguyen.duong.lieu@example.test', academicTitle: 'NCV hạng III', degree: 'ThS', staffCategory: 'RESEARCHER' },
] as const;

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
        name: 'Lý Việt Trường',
        email: 'test@test.com',
        password: passwordTest,
        tenantId: tenant.id,
        role: ROLE.Staff,
        staffCategory: 'RESEARCHER',
        academicTitle: 'Nghiên cứu viên',
        degree: 'TS',
      },
    });
  } else {
    await prisma.users.update({
      where: { id: user.id },
      data: {
        name: 'Lý Việt Trường',
        password: passwordTest,
        tenantId: tenant.id,
        role: ROLE.Staff,
        staffCategory: 'RESEARCHER',
        academicTitle: 'Nghiên cứu viên',
        degree: 'TS',
      },
    });
  }

  const managerUser = await prisma.users.findUnique({
    where: { email: 'manager@test.com' },
  });

  if (!managerUser) {
    await prisma.users.create({
      data: {
        name: 'Tài khoản Quản lý',
        email: 'manager@test.com',
        password: passwordTest,
        tenantId: tenant.id,
        role: ROLE.Manager,
        managementRole: 'Quản lý đơn vị',
      },
    });
  } else {
    await prisma.users.update({
      where: { id: managerUser.id },
      data: {
        name: 'Tài khoản Quản lý',
        password: passwordTest,
        tenantId: tenant.id,
        role: ROLE.Manager,
        staffCategory: null,
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

  for (const staff of spreadsheetStaff) {
    await prisma.users.upsert({
      where: { email: staff.email },
      update: {
        name: staff.name,
        password: passwordTest,
        tenantId: tenant.id,
        role: ROLE.Staff,
        staffCategory: staff.staffCategory,
        academicTitle: staff.academicTitle,
        degree: staff.degree,
        department: 'Viện Việt Nam học và Khoa học phát triển',
      },
      create: {
        name: staff.name,
        email: staff.email,
        password: passwordTest,
        tenantId: tenant.id,
        role: ROLE.Staff,
        staffCategory: staff.staffCategory,
        academicTitle: staff.academicTitle,
        degree: staff.degree,
        department: 'Viện Việt Nam học và Khoa học phát triển',
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

  const domestic = await prisma.publication_classifications.upsert({
    where: { name: 'TRONG NƯỚC' },
    update: {},
    create: {
      name: 'TRONG NƯỚC',
      description: 'Tạp chí và đặc san khoa học trong nước',
    },
  });

  const internationalConference = await prisma.publication_classifications.upsert({
    where: { name: 'HỘI THẢO QUỐC TẾ' },
    update: {},
    create: {
      name: 'HỘI THẢO QUỐC TẾ',
      description: 'Kỷ yếu hội thảo khoa học quốc tế',
    },
  });

  await prisma.publication_sources.upsert({
    where: { name_classificationId: { name: 'Sample Journal ISI', classificationId: isi.id } },
    update: {},
    create: { name: 'Sample Journal ISI', classificationId: isi.id, quartile: 'Q1' },
  });

  const catalogSources = [
    { name: 'Journal of Ethnobiology and Ethnomedicine', classificationId: scopus.id, quartile: null },
    { name: 'Vietnam Journal of Earth Sciences', classificationId: scopus.id, quartile: 'Q2' },
    { name: 'Biomedical Research and Therapy', classificationId: scopus.id, quartile: 'Q4' },
    { name: 'Journal of Science and Transport Technology', classificationId: scopus.id, quartile: 'Q3' },
    { name: 'Vietnam Journal of Science and Technology', classificationId: scopus.id, quartile: 'Q4' },
    { name: 'CTU Journal of Innovation and Sustainable Development', classificationId: scopus.id, quartile: 'Q4' },
    { name: 'Tạp chí Khoa học Xã hội và Nhân văn', classificationId: domestic.id },
    { name: 'Tạp chí Khoa học xã hội Việt Nam', classificationId: domestic.id },
    { name: 'Tạp chí Nghiên cứu Văn hóa', classificationId: domestic.id },
    { name: 'Đặc san Di sản văn hóa', classificationId: domestic.id },
    {
      name: 'Kỷ yếu hội thảo khoa học quốc tế Ngôn ngữ học và Việt Nam học trong kỷ nguyên mới',
      classificationId: internationalConference.id,
    },
  ];
  for (const source of catalogSources) {
    await prisma.publication_sources.upsert({
      where: { name_classificationId: { name: source.name, classificationId: source.classificationId } },
      update: { quartile: source.quartile },
      create: source,
    });
  }

  await prisma.publication_sources.upsert({
    where: {
      name_classificationId: { name: 'Sample Journal Scopus', classificationId: scopus.id },
    },
    update: { quartile: 'Q2' },
    create: { name: 'Sample Journal Scopus', classificationId: scopus.id, quartile: 'Q2' },
  });

  type RuleSeed = {
    code: string;
    label: string;
    activityType: string;
    unit: string;
    hours: number;
    priority?: number;
    minHours?: number;
    maxHours?: number;
    classificationId?: bigint;
    conditions?: string;
  };

  const rule = (
    code: string,
    label: string,
    activityType: string,
    unit: string,
    hours: number,
    options: Omit<RuleSeed, 'code' | 'label' | 'activityType' | 'unit' | 'hours'> = {},
  ): RuleSeed => ({ code, label, activityType, unit, hours, ...options });

  const rules: RuleSeed[] = [
    rule(
      'TEACHING_LECTURE_LT_40',
      'Giảng lý thuyết dưới 40 sinh viên',
      ACTIVITY_TYPE.TEACHING,
      'tín chỉ',
      1.1,
    ),
    rule(
      'TEACHING_LECTURE_40_80',
      'Giảng lý thuyết từ 40 đến 80 sinh viên',
      ACTIVITY_TYPE.TEACHING,
      'tín chỉ',
      1.5,
      { maxHours: 1.5 },
    ),
    rule(
      'TEACHING_LECTURE_GT_80',
      'Giảng lý thuyết trên 80 sinh viên',
      ACTIVITY_TYPE.TEACHING,
      'tín chỉ',
      1.8,
    ),
    rule('TEACHING_PRACTICAL', 'Giảng thực hành', ACTIVITY_TYPE.TEACHING, 'tín chỉ', 1),
    rule('TEACHING_PRACTICAL_PERIOD', 'Giảng thực hành/thực tế theo tiết', ACTIVITY_TYPE.TEACHING, 'tiết', 1),
    rule('TEACHING_SELF_STUDY_PERIOD', 'Hướng dẫn tự học bắt buộc theo tiết', ACTIVITY_TYPE.TEACHING, 'tiết', 0.3),
    rule(
      'TEACHING_SELF_STUDY',
      'Hướng dẫn tự học bắt buộc',
      ACTIVITY_TYPE.TEACHING,
      'tín chỉ',
      0.3,
    ),
    rule(
      'TEACHING_FIELDWORK_DAY',
      'Hướng dẫn thực tế/thực tập',
      ACTIVITY_TYPE.TEACHING,
      'ngày',
      2.5,
    ),
    rule(
      'TEACHING_BACHELOR_THESIS',
      'Hướng dẫn khóa luận tốt nghiệp',
      ACTIVITY_TYPE.TEACHING,
      'đề tài',
      20,
    ),
    rule(
      'TEACHING_ADVANCED_THESIS',
      'Hướng dẫn khóa luận chất lượng cao/quốc tế',
      ACTIVITY_TYPE.TEACHING,
      'đề tài',
      25,
    ),
    rule(
      'TEACHING_TERM_PAPER',
      'Chấm tiểu luận/bài tập lớn',
      ACTIVITY_TYPE.TEACHING,
      'tín chỉ',
      1.5,
    ),
    rule(
      'TEACHING_EXAM_SUPPORT',
      'Ra đề, coi thi, chấm thi (12% giờ chuẩn)',
      ACTIVITY_TYPE.TEACHING,
      'giờ chuẩn',
      0.12,
      {
        conditions: JSON.stringify({ rate: 0.12, source: 'Phụ lục II' }),
      },
    ),
    rule('POSTGRAD_MASTER_LECTURE', 'Giảng cao học (theo tiết)', ACTIVITY_TYPE.TEACHING, 'tiết', 1.7, {
      minHours: 1.6,
      maxHours: 1.8,
    }),
    rule(
      'POSTGRAD_DOCTORAL_LECTURE',
      'Giảng nghiên cứu sinh',
      ACTIVITY_TYPE.TEACHING,
      'tiết',
      2,
    ),
    rule(
      'POSTGRAD_FOREIGN_LECTURE',
      'Giảng môn chuyên ngành bằng ngoại ngữ',
      ACTIVITY_TYPE.TEACHING,
      'tín chỉ',
      2.5,
      { maxHours: 2.5 },
    ),
    rule(
      'POSTGRAD_MASTER_THESIS',
      'Hướng dẫn luận văn thạc sĩ',
      ACTIVITY_TYPE.TEACHING,
      'luận văn',
      70,
    ),
    rule(
      'POSTGRAD_MASTER_THESIS_ADVANCED',
      'Hướng dẫn luận văn thạc sĩ chất lượng cao/quốc tế',
      ACTIVITY_TYPE.TEACHING,
      'luận văn',
      84,
    ),
    rule(
      'POSTGRAD_DOCTORAL_MAIN_Y1',
      'Hướng dẫn chính luận án tiến sĩ năm 1',
      ACTIVITY_TYPE.TEACHING,
      'luận án',
      35,
    ),
    rule(
      'POSTGRAD_DOCTORAL_MAIN_Y2',
      'Hướng dẫn chính luận án tiến sĩ năm 2',
      ACTIVITY_TYPE.TEACHING,
      'luận án',
      45,
    ),
    rule(
      'POSTGRAD_DOCTORAL_MAIN_Y3',
      'Hướng dẫn chính luận án tiến sĩ năm 3',
      ACTIVITY_TYPE.TEACHING,
      'luận án',
      50,
    ),
    rule(
      'POSTGRAD_DOCTORAL_ASSIST_Y1',
      'Hướng dẫn phụ luận án tiến sĩ năm 1',
      ACTIVITY_TYPE.TEACHING,
      'luận án',
      15,
    ),
    rule(
      'POSTGRAD_DOCTORAL_ASSIST_Y2',
      'Hướng dẫn phụ luận án tiến sĩ năm 2',
      ACTIVITY_TYPE.TEACHING,
      'luận án',
      25,
    ),
    rule(
      'POSTGRAD_DOCTORAL_ASSIST_Y3',
      'Hướng dẫn phụ luận án tiến sĩ năm 3',
      ACTIVITY_TYPE.TEACHING,
      'luận án',
      30,
    ),
    rule(
      'POSTGRAD_DOCTORAL_CO_Y1',
      'Đồng hướng dẫn luận án tiến sĩ năm 1',
      ACTIVITY_TYPE.TEACHING,
      'luận án',
      25,
    ),
    rule(
      'POSTGRAD_DOCTORAL_CO_Y2',
      'Đồng hướng dẫn luận án tiến sĩ năm 2',
      ACTIVITY_TYPE.TEACHING,
      'luận án',
      25,
    ),
    rule(
      'POSTGRAD_DOCTORAL_CO_Y3',
      'Đồng hướng dẫn luận án tiến sĩ năm 3/năm bảo vệ',
      ACTIVITY_TYPE.TEACHING,
      'luận án',
      25,
    ),
    rule(
      'POSTGRAD_TERM_PAPER',
      'Chấm tiểu luận sau đại học',
      ACTIVITY_TYPE.TEACHING,
      'tín chỉ',
      1.5,
    ),
    rule(
      'POSTGRAD_DOCTORAL_SPECIALTY',
      'Giảng chuyên đề tiến sĩ',
      ACTIVITY_TYPE.TEACHING,
      'tín chỉ',
      2,
    ),

    ...(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((quartile) =>
      rule(
        `RESEARCH_ARTICLE_WOS_SCOPUS_${quartile}`,
        `Bài báo WoS/Scopus ${quartile}`,
        ACTIVITY_TYPE.RESEARCH,
        'bài báo',
        { Q1: 1200, Q2: 1100, Q3: 900, Q4: 800 }[quartile],
        { maxHours: { Q1: 1200, Q2: 1100, Q3: 900, Q4: 800 }[quartile], priority: 30 },
      ),
    ),
    rule(
      'RESEARCH_ARTICLE_FOREIGN_OTHER',
      'Bài báo quốc tế ngoài WoS/Scopus tại tạp chí uy tín',
      ACTIVITY_TYPE.RESEARCH,
      'bài báo',
      650,
      { maxHours: 650 },
    ),
    rule(
      'RESEARCH_ARTICLE_INTERNATIONAL_ISSN',
      'Bài báo quốc tế khác có mã ISSN',
      ACTIVITY_TYPE.RESEARCH,
      'bài báo',
      700,
      { maxHours: 700 },
    ),
    rule(
      'RESEARCH_ARTICLE_VNU_SCOPUS_SECTION',
      'Chuyên san tạp chí ĐHQGHN đạt chuẩn Scopus',
      ACTIVITY_TYPE.RESEARCH,
      'bài báo',
      500,
      { maxHours: 500 },
    ),
    rule(
      'RESEARCH_ARTICLE_DOMESTIC_05',
      'Bài báo trong nước tối đa 0,5 điểm',
      ACTIVITY_TYPE.RESEARCH,
      'bài báo',
      300,
      { maxHours: 300 },
    ),
    rule(
      'RESEARCH_ARTICLE_DOMESTIC_075',
      'Bài báo trong nước tối đa 0,75 điểm',
      ACTIVITY_TYPE.RESEARCH,
      'bài báo',
      450,
      { maxHours: 450 },
    ),
    rule(
      'RESEARCH_ARTICLE_DOMESTIC_1',
      'Bài báo trong nước tối đa 1 điểm',
      ACTIVITY_TYPE.RESEARCH,
      'bài báo',
      600,
      { maxHours: 600 },
    ),
    rule(
      'RESEARCH_CONFERENCE_ISI_SCOPUS',
      'Kỷ yếu hội nghị quốc tế ISI/Scopus (tối đa 900 giờ)',
      ACTIVITY_TYPE.RESEARCH,
      'bài',
      900,
      { maxHours: 900 },
    ),
    rule(
      'RESEARCH_CONFERENCE_INTERNATIONAL_REVIEWED',
      'Kỷ yếu hội nghị quốc tế có phản biện',
      ACTIVITY_TYPE.RESEARCH,
      'bài',
      500,
      { maxHours: 500 },
    ),
    rule(
      'RESEARCH_CONFERENCE_NATIONAL_ISBN',
      'Kỷ yếu hội nghị trong nước có ISBN và phản biện',
      ACTIVITY_TYPE.RESEARCH,
      'bài',
      400,
      { maxHours: 400 },
    ),
    rule(
      'RESEARCH_BOOK_DOMESTIC_MONOGRAPH',
      'Sách chuyên khảo trong nước (tối đa 1.800 giờ)',
      ACTIVITY_TYPE.RESEARCH,
      'sách',
      1800,
      { maxHours: 1800 },
    ),
    rule(
      'RESEARCH_BOOK_DOMESTIC_TEXTBOOK',
      'Giáo trình/tài liệu giảng dạy trong nước (tối đa 1.200 giờ)',
      ACTIVITY_TYPE.RESEARCH,
      'sách',
      1200,
      { maxHours: 1200 },
    ),
    rule(
      'RESEARCH_BOOK_DOMESTIC_REFERENCE',
      'Sách tham khảo trong nước (tối đa 900 giờ)',
      ACTIVITY_TYPE.RESEARCH,
      'sách',
      900,
      { maxHours: 900 },
    ),
    rule(
      'RESEARCH_BOOK_FOREIGN_MONOGRAPH',
      'Sách chuyên khảo quốc tế (tối đa 2.700 giờ)',
      ACTIVITY_TYPE.RESEARCH,
      'sách',
      2700,
      { maxHours: 2700 },
    ),
    rule(
      'RESEARCH_BOOK_FOREIGN_REFERENCE',
      'Sách tham khảo quốc tế (tối đa 1.800 giờ)',
      ACTIVITY_TYPE.RESEARCH,
      'sách',
      1800,
      { maxHours: 1800 },
    ),
    rule(
      'RESEARCH_BOOK_FOREIGN_CHAPTER',
      'Chương sách chuyên khảo quốc tế (tối đa 1.200 giờ)',
      ACTIVITY_TYPE.RESEARCH,
      'chương sách',
      1200,
      { maxHours: 1200 },
    ),
    rule(
      'RESEARCH_PATENT_INTERNATIONAL',
      'Bằng độc quyền sáng chế quốc tế (tối đa 3.000 giờ)',
      ACTIVITY_TYPE.RESEARCH,
      'sản phẩm',
      3000,
      { maxHours: 3000 },
    ),
    rule(
      'RESEARCH_PATENT_VIETNAM',
      'Bằng độc quyền sáng chế Việt Nam (tối đa 1.200 giờ)',
      ACTIVITY_TYPE.RESEARCH,
      'sản phẩm',
      1200,
      { maxHours: 1200 },
    ),
    rule(
      'RESEARCH_UTILITY_OR_AWARD',
      'Giải pháp hữu ích/giải thưởng quốc gia, quốc tế (tối đa 600 giờ)',
      ACTIVITY_TYPE.RESEARCH,
      'sản phẩm',
      600,
      { maxHours: 600 },
    ),
    rule(
      'RESEARCH_PROJECT_STATE_LEAD',
      'Đề tài cấp Nhà nước - chủ nhiệm',
      ACTIVITY_TYPE.RESEARCH,
      'đề tài',
      500,
    ),
    rule(
      'RESEARCH_PROJECT_STATE_SECRETARY',
      'Đề tài cấp Nhà nước - thư ký khoa học',
      ACTIVITY_TYPE.RESEARCH,
      'đề tài',
      250,
    ),
    rule(
      'RESEARCH_PROJECT_STATE_MEMBER',
      'Đề tài cấp Nhà nước - thành viên',
      ACTIVITY_TYPE.RESEARCH,
      'đề tài',
      250,
    ),
    rule(
      'RESEARCH_PROJECT_MINISTRY_LEAD',
      'Đề tài cấp Bộ/ĐHQGHN - chủ nhiệm',
      ACTIVITY_TYPE.RESEARCH,
      'đề tài',
      300,
    ),
    rule(
      'RESEARCH_PROJECT_MINISTRY_SECRETARY',
      'Đề tài cấp Bộ/ĐHQGHN - thư ký khoa học',
      ACTIVITY_TYPE.RESEARCH,
      'đề tài',
      100,
    ),
    rule(
      'RESEARCH_PROJECT_MINISTRY_MEMBER',
      'Đề tài cấp Bộ/ĐHQGHN - thành viên',
      ACTIVITY_TYPE.RESEARCH,
      'đề tài',
      100,
    ),
    rule(
      'RESEARCH_PROJECT_INSTITUTE_LEAD',
      'Đề tài cấp Viện - chủ nhiệm',
      ACTIVITY_TYPE.RESEARCH,
      'đề tài',
      150,
    ),
    rule(
      'RESEARCH_SEMINAR_REPORT',
      'Báo cáo hội thảo/hội nghị',
      ACTIVITY_TYPE.RESEARCH,
      'báo cáo',
      50,
    ),
    rule(
      'RESEARCH_SEMINAR_ATTENDANCE',
      'Tham dự hội thảo/hội nghị (tối đa 150 giờ/năm)',
      ACTIVITY_TYPE.RESEARCH,
      'buổi',
      5,
      {
        maxHours: 150,
        conditions: JSON.stringify({ maxTotalHours: 150, capGroup: 'RESEARCH_SEMINAR_ATTENDANCE' }),
      },
    ),
    rule(
      'RESEARCH_COUNCIL_INSTITUTE_CHAIR',
      'Hội đồng cấp Viện - chủ tịch',
      ACTIVITY_TYPE.RESEARCH,
      'hội đồng',
      7,
      { conditions: JSON.stringify({ maxTotalHours: 150, capGroup: 'RESEARCH_COUNCIL' }) },
    ),
    rule(
      'RESEARCH_COUNCIL_INSTITUTE_SECRETARY_REVIEWER',
      'Hội đồng cấp Viện - thư ký/phản biện',
      ACTIVITY_TYPE.RESEARCH,
      'hội đồng',
      5,
      { conditions: JSON.stringify({ maxTotalHours: 150, capGroup: 'RESEARCH_COUNCIL' }) },
    ),
    rule(
      'RESEARCH_COUNCIL_INSTITUTE_MEMBER',
      'Hội đồng cấp Viện - thành viên',
      ACTIVITY_TYPE.RESEARCH,
      'hội đồng',
      3,
      { conditions: JSON.stringify({ maxTotalHours: 150, capGroup: 'RESEARCH_COUNCIL' }) },
    ),
    rule(
      'RESEARCH_COUNCIL_MINISTRY_CHAIR',
      'Hội đồng cấp Bộ - chủ tịch',
      ACTIVITY_TYPE.RESEARCH,
      'hội đồng',
      10,
      { conditions: JSON.stringify({ maxTotalHours: 150, capGroup: 'RESEARCH_COUNCIL' }) },
    ),
    rule(
      'RESEARCH_COUNCIL_MINISTRY_SECRETARY_REVIEWER',
      'Hội đồng cấp Bộ - thư ký/phản biện',
      ACTIVITY_TYPE.RESEARCH,
      'hội đồng',
      7,
      { conditions: JSON.stringify({ maxTotalHours: 150, capGroup: 'RESEARCH_COUNCIL' }) },
    ),
    rule(
      'RESEARCH_COUNCIL_MINISTRY_MEMBER',
      'Hội đồng cấp Bộ - thành viên',
      ACTIVITY_TYPE.RESEARCH,
      'hội đồng',
      5,
      { conditions: JSON.stringify({ maxTotalHours: 150, capGroup: 'RESEARCH_COUNCIL' }) },
    ),
    rule(
      'RESEARCH_COUNCIL_NATIONAL_CHAIR',
      'Hội đồng cấp Nhà nước - chủ tịch',
      ACTIVITY_TYPE.RESEARCH,
      'hội đồng',
      15,
      { conditions: JSON.stringify({ maxTotalHours: 150, capGroup: 'RESEARCH_COUNCIL' }) },
    ),
    rule(
      'RESEARCH_COUNCIL_NATIONAL_SECRETARY_REVIEWER',
      'Hội đồng cấp Nhà nước - thư ký/phản biện',
      ACTIVITY_TYPE.RESEARCH,
      'hội đồng',
      10,
      { conditions: JSON.stringify({ maxTotalHours: 150, capGroup: 'RESEARCH_COUNCIL' }) },
    ),
    rule(
      'RESEARCH_COUNCIL_NATIONAL_MEMBER',
      'Hội đồng cấp Nhà nước - thành viên',
      ACTIVITY_TYPE.RESEARCH,
      'hội đồng',
      7,
      { conditions: JSON.stringify({ maxTotalHours: 150, capGroup: 'RESEARCH_COUNCIL' }) },
    ),
    rule(
      'RESEARCH_COUNCIL_TECHNICAL_CHAIR',
      'Hội đồng nghiệm thu kỹ thuật - chủ tịch',
      ACTIVITY_TYPE.RESEARCH,
      'hội đồng',
      7,
      { conditions: JSON.stringify({ maxTotalHours: 150, capGroup: 'RESEARCH_COUNCIL' }) },
    ),
    rule(
      'RESEARCH_COUNCIL_TECHNICAL_SECRETARY_REVIEWER',
      'Hội đồng nghiệm thu kỹ thuật - thư ký/phản biện',
      ACTIVITY_TYPE.RESEARCH,
      'hội đồng',
      5,
      { conditions: JSON.stringify({ maxTotalHours: 150, capGroup: 'RESEARCH_COUNCIL' }) },
    ),
    rule(
      'RESEARCH_COUNCIL_TECHNICAL_MEMBER',
      'Hội đồng nghiệm thu kỹ thuật - thành viên',
      ACTIVITY_TYPE.RESEARCH,
      'hội đồng',
      3,
      { conditions: JSON.stringify({ maxTotalHours: 150, capGroup: 'RESEARCH_COUNCIL' }) },
    ),

    rule(
      'TRANSFER_FUNDED_MIN',
      'Chuyển giao được cấp kinh phí',
      ACTIVITY_TYPE.KNOWLEDGE_TRANSFER,
      'nhiệm vụ/sản phẩm',
      100,
      {
        priority: 10,
        conditions: JSON.stringify({ minimumHours: 100, note: 'Mức cụ thể do đơn vị quy định' }),
      },
    ),
    rule(
      'TRANSFER_UNIVERSITY_INSTITUTE_BUSINESS',
      'Hợp tác ĐH - Viện - Doanh nghiệp có giao nhiệm vụ',
      ACTIVITY_TYPE.KNOWLEDGE_TRANSFER,
      'nhiệm vụ',
      100,
      {
        priority: 10,
        conditions: JSON.stringify({ minimumHours: 100, note: 'Mức cụ thể do đơn vị quy định' }),
      },
    ),
    rule(
      'OTHER_APPROVED_HOUR',
      'Hoạt động khác được đơn vị phê duyệt',
      ACTIVITY_TYPE.OTHER,
      'giờ được phê duyệt',
      1,
      {
        conditions: JSON.stringify({ maxTotalHours: 150, capGroup: 'OTHER_APPROVED_HOUR' }),
      },
    ),
  ];

  // Không tạo một rule ISI/Scopus chung: 1.1 của quy định mới bắt buộc phải
  // xác định Q1/Q2/Q3/Q4 trước khi tính giờ.
  await prisma.conversion_rules.updateMany({
    where: { activityType: ACTIVITY_TYPE.KNOWLEDGE_TRANSFER, academicYearId: academicYear.id },
    data: {
      code: 'TRANSFER_FUNDED_MIN',
      label: 'Chuyển giao được cấp kinh phí',
      unit: 'nhiệm vụ/sản phẩm',
      hours: 100,
      priority: 10,
    },
  });

  for (const item of rules) {
    const existing = await prisma.conversion_rules.findFirst({
      where: {
        code: item.code,
        activityType: item.activityType,
        academicYearId: academicYear.id,
        classificationId: item.classificationId ?? null,
      },
    });
    const data = {
      code: item.code,
      label: item.label,
      activityType: item.activityType,
      unit: item.unit,
      minHours: item.minHours,
      maxHours: item.maxHours,
      classificationId: item.classificationId,
      academicYearId: academicYear.id,
      hours: item.hours,
      priority: item.priority ?? 0,
      conditions: item.conditions,
    };
    if (existing) await prisma.conversion_rules.update({ where: { id: existing.id }, data });
    else await prisma.conversion_rules.create({ data });
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
