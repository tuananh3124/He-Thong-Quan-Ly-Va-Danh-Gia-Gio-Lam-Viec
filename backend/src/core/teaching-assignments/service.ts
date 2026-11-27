import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import axios from 'axios';
import { ACTIVITY_TYPE, DECLARATION_STATUS, ROLE, ROLE_TYPE, STAFF_CATEGORY } from '@projectname/shared';
import { PrismaService } from '@/common';
import { DeclarationRuleEngineService } from '../declarations/rule-engine.service';
import { getEnv } from '@/utils';

type ParsedAssignment = {
  row_number?: number;
  lecturer_name?: string;
  course_name?: string;
  class_name?: string | null;
  education_level?: string | null;
  teaching_type?: string | null;
  credits?: number | null;
  periods?: number | null;
  theory_periods?: number | null;
  practical_periods?: number | null;
  self_study_periods?: number | null;
  student_count?: number | null;
  quantity?: number | null;
  quantity_unit?: string | null;
  rule_code?: string | null;
  source_text?: string | null;
};

const normalize = (value?: string | null) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const normalizePersonName = (value?: string | null) => {
  const removableTitles = new Set([
    'gs',
    'pgs',
    'ts',
    'ths',
    'tien si',
    'thac si',
    'gvc',
    'gvcc',
    'gv',
    'ncv',
  ]);
  const words = normalize(value).split(' ').filter(Boolean);
  while (words.length && removableTitles.has(words[0])) words.shift();
  return words.join(' ');
};

const positiveNumber = (value: unknown, fallback = 1) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const repairUploadedFilename = (value: string) => {
  // Multer/busboy can expose UTF-8 filenames as Latin-1 text on Windows.
  // Decode only when the string has the typical mojibake markers so normal
  // filenames are left unchanged.
  if (!/[ÃÂáàạảấầẩẫậắằẳẵặđ»]/u.test(value)) return value;
  try {
    const repaired = Buffer.from(value, 'latin1').toString('utf8');
    return repaired.includes('�') ? value : repaired;
  } catch {
    return value;
  }
};

const serializeRow = (row: any) => ({
  rowNumber: row.rowNumber,
  lecturerName: row.lecturerName,
  matchedUserId: row.matchedUserId ?? null,
  matchedUserName: row.matchedUserName ?? null,
  courseName: row.courseName,
  className: row.className ?? null,
  educationLevel: row.educationLevel ?? null,
  credits: row.credits ?? null,
  periods: row.periods ?? null,
  theoryPeriods: row.theoryPeriods ?? null,
  practicalPeriods: row.practicalPeriods ?? null,
  selfStudyPeriods: row.selfStudyPeriods ?? null,
  quantity: row.quantity,
  quantityUnit: row.quantityUnit,
  studentCount: row.studentCount ?? null,
  ruleCode: row.ruleCode ?? null,
  calculatedHours: row.calculatedHours ?? null,
  status: row.status,
  message: row.message ?? null,
});

@Injectable()
export class TeachingAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ruleEngine: DeclarationRuleEngineService,
  ) {}

  private async managerTenantId(managerId: string) {
    const manager = await this.prisma.users.findUnique({
      where: { id: BigInt(managerId) },
      select: { tenantId: true },
    });
    if (!manager?.tenantId) throw new ForbiddenException('Tài khoản quản lý chưa thuộc đơn vị');
    return manager.tenantId;
  }

  private async callParser(file: Express.Multer.File) {
    const serviceUrl = getEnv('AI_SERVICE_URL');
    if (!serviceUrl) throw new BadRequestException('Dịch vụ xử lý tài liệu chưa được cấu hình');
    try {
      const form = new FormData();
      form.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);
      const response = await axios.post(
        `${serviceUrl.replace(/\/$/, '')}/teaching-assignments/parse`,
        form,
        { timeout: 120_000 },
      );
      return response.data as {
        assignments?: ParsedAssignment[];
        guidance_assignments?: ParsedAssignment[];
        model?: string;
        confidence?: number;
        needs_review?: boolean;
        warnings?: string[];
      };
    } catch (error: any) {
      const detail = error?.response?.data?.detail || 'Không thể đọc file phân công giảng dạy';
      throw new BadRequestException(detail);
    }
  }

  private inferRuleCode(row: ParsedAssignment) {
    if (row.rule_code) return row.rule_code;
    const text = normalize(`${row.education_level ?? ''} ${row.course_name ?? ''} ${row.teaching_type ?? ''}`);
    if (text.includes('tien si') || text.includes('doctoral') || text.includes('phd')) {
      return 'POSTGRAD_DOCTORAL_LECTURE';
    }
    if (text.includes('thac si') || text.includes('cao hoc') || text.includes('master')) {
      return 'POSTGRAD_MASTER_LECTURE';
    }
    if (text.includes('thuc hanh') || text.includes('thi nghiem') || text.includes('bai tap') || text.includes('thao luan')) {
      return 'TEACHING_PRACTICAL';
    }
    const students = Number(row.student_count ?? 0);
    if (students > 80) return 'TEACHING_LECTURE_GT_80';
    if (students >= 40) return 'TEACHING_LECTURE_40_80';
    return 'TEACHING_LECTURE_LT_40';
  }

  private async findRule(ruleCode: string, academicYearId: bigint) {
    const rules = await this.prisma.conversion_rules.findMany({
      where: { activityType: ACTIVITY_TYPE.TEACHING, code: ruleCode },
      orderBy: [{ academicYearId: 'desc' }, { priority: 'desc' }],
    });
    return rules.find((rule) => !rule.academicYearId || rule.academicYearId === academicYearId) ?? null;
  }

  private async findStaffUsers(managerId: string, role: ROLE_TYPE) {
    const tenantId = role === ROLE.Manager ? await this.managerTenantId(managerId) : undefined;
    return this.prisma.users.findMany({
      where: {
        role: ROLE.Staff,
        staffCategory: {
          in: [STAFF_CATEGORY.Lecturer, STAFF_CATEGORY.Researcher, STAFF_CATEGORY.LecturerResearcher],
        },
        tenantId,
      },
      select: { id: true, name: true, email: true, staffCategory: true, tenantId: true },
    });
  }

  async importDocument(
    managerId: string,
    role: ROLE_TYPE,
    academicYearIdValue: string | undefined,
    file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn file PDF hoặc Word phân công giảng dạy');
    const extension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    const isPdf = extension === '.pdf' && file.buffer.subarray(0, 5).toString() === '%PDF-';
    const isDocx = extension === '.docx' && file.buffer.subarray(0, 2).toString() === 'PK';
    if (!isPdf && !isDocx) {
      throw new BadRequestException('Tệp tải lên không phải là PDF hoặc Word .docx hợp lệ');
    }

    const academicYearId = academicYearIdValue ? BigInt(academicYearIdValue) : null;
    const academicYear = academicYearId
      ? await this.prisma.academic_years.findUnique({ where: { id: academicYearId } })
      : await this.prisma.academic_years.findFirst({ where: { isActive: true }, orderBy: { startDate: 'desc' } });
    if (!academicYear) throw new BadRequestException('Không tìm thấy năm học để nhập phân công');

    const parsed = await this.callParser(file);
    const teachingAssignments = Array.isArray(parsed.assignments) ? parsed.assignments : [];
    const guidanceAssignments = Array.isArray(parsed.guidance_assignments)
      ? parsed.guidance_assignments
      : [];
    const teachingComponents = teachingAssignments.flatMap((assignment) => {
      const level = normalize(assignment.education_level);
      const components: ParsedAssignment[] = [];
      const courseName = String(assignment.course_name ?? 'Phân công giảng dạy').trim();
      const addComponent = (periods: number | null | undefined, label: string, ruleCode: string) => {
        if (!periods || periods <= 0) return;
        components.push({
          ...assignment,
          course_name: `${courseName} - ${label}`,
          quantity: periods,
          quantity_unit: 'tiết',
          rule_code: ruleCode,
        });
      };

      const theoryRule = level.includes('tien si')
        ? 'POSTGRAD_DOCTORAL_LECTURE'
        : level.includes('thac si')
          ? 'POSTGRAD_MASTER_LECTURE'
          : this.inferRuleCode(assignment);
      addComponent(assignment.theory_periods, 'lý thuyết', theoryRule);
      addComponent(assignment.practical_periods, 'thực hành/thực tế', 'TEACHING_PRACTICAL_PERIOD');
      addComponent(assignment.self_study_periods, 'tự học bắt buộc', 'TEACHING_SELF_STUDY_PERIOD');
      return components.length ? components : [assignment];
    });
    const assignments = [...teachingComponents, ...guidanceAssignments];
    if (!assignments.length) {
      throw new BadRequestException('Không tìm thấy dòng phân công giảng dạy trong file');
    }

    const staff = await this.findStaffUsers(managerId, role);
    const exactStaff = new Map(staff.map((item) => [normalizePersonName(item.name), item]));
    const lecturerCount = new Set(
      assignments.map((assignment) => normalizePersonName(String(assignment.lecturer_name ?? ''))).filter(Boolean),
    ).size;
    const storageDirectory = join(process.cwd(), 'uploads', 'teaching-assignments');
    const storagePath = join(storageDirectory, `${randomUUID()}${extension}`);
    const originalName =
      repairUploadedFilename(file.originalname).replace(/[\\/]/g, '_').slice(0, 255) ||
      'phan-cong-giang-day.pdf';
    await mkdir(storageDirectory, { recursive: true });
    await writeFile(storagePath, file.buffer, { flag: 'wx' });

    const results: any[] = [];
    let importedCount = 0;
    let skippedCount = 0;
    let unmatchedCount = 0;
    const existingTeachingNames = new Map<string, Array<{ name: string; calculatedHours: number | null }>>();

    try {
      for (const [index, assignment] of assignments.entries()) {
        const lecturerName = String(assignment.lecturer_name ?? '').trim();
        const normalizedName = normalizePersonName(lecturerName);
        const exact = exactStaff.get(normalizedName);
        const fuzzy = exact ?? staff.find((item) => {
          const candidate = normalizePersonName(item.name);
          return candidate && normalizedName && (candidate.includes(normalizedName) || normalizedName.includes(candidate));
        });
        const baseRow = {
          rowNumber: results.length + 1,
          lecturerName: lecturerName || 'Chưa đọc được tên giảng viên',
          matchedUserId: fuzzy?.id.toString(),
          matchedUserName: fuzzy?.name,
          courseName: String(assignment.course_name ?? 'Phân công giảng dạy').trim(),
          className: assignment.class_name,
          educationLevel: assignment.education_level,
          credits: assignment.credits ?? null,
          periods: assignment.periods ?? null,
          theoryPeriods: assignment.theory_periods ?? null,
          practicalPeriods: assignment.practical_periods ?? null,
          selfStudyPeriods: assignment.self_study_periods ?? null,
          quantity: positiveNumber(assignment.quantity ?? assignment.credits ?? assignment.periods),
          quantityUnit: assignment.quantity_unit ?? (assignment.credits != null ? 'tín chỉ' : 'đơn vị'),
          studentCount: assignment.student_count ?? null,
          ruleCode: null,
          calculatedHours: null,
          status: 'UNMATCHED',
          message: null,
        };

        if (!fuzzy) {
          unmatchedCount += 1;
          baseRow.message = 'Không tìm thấy tài khoản giảng viên trùng tên trong đơn vị';
          results.push(serializeRow(baseRow));
          continue;
        }

        const ruleCode = this.inferRuleCode(assignment);
        const rule = await this.findRule(ruleCode, academicYear.id);
        baseRow.ruleCode = rule?.code ?? ruleCode;
        if (!rule) {
          baseRow.status = 'FAILED';
          baseRow.message = `Chưa có luật quy đổi ${ruleCode} cho năm học này`;
          results.push(serializeRow(baseRow));
          continue;
        }

        let quantity = baseRow.quantity;
        if (baseRow.quantityUnit === 'tiết' && rule.unit === 'tín chỉ') quantity = quantity / 15;
        if (baseRow.quantityUnit === 'tín chỉ' && rule.unit === 'tiết') quantity = quantity * 15;
        quantity = Math.max(0.01, quantity);
        baseRow.quantity = Number(quantity.toFixed(2));
        const name = `${baseRow.courseName}${baseRow.className ? ` - ${baseRow.className}` : ''}`;
        const userKey = fuzzy.id.toString();
        let existing = existingTeachingNames.get(userKey);
        if (!existing) {
          existing = await this.prisma.declarations.findMany({
            where: {
              userId: fuzzy.id,
              academicYearId: academicYear.id,
              activityType: ACTIVITY_TYPE.TEACHING,
              status: { not: DECLARATION_STATUS.REJECTED },
            },
            select: { name: true, calculatedHours: true },
          });
          existingTeachingNames.set(userKey, existing);
        }
        const duplicate = existing.find((item) => normalize(item.name) === normalize(name));
        if (duplicate) {
          skippedCount += 1;
          baseRow.status = 'SKIPPED';
          baseRow.calculatedHours = duplicate.calculatedHours;
          baseRow.message = 'Bỏ qua vì bản phân công này đã tồn tại trong năm học';
          results.push(serializeRow(baseRow));
          continue;
        }

        const declaration = await this.prisma.declarations.create({
          data: {
            userId: fuzzy.id,
            academicYearId: academicYear.id,
            activityType: ACTIVITY_TYPE.TEACHING,
            name,
            conversionRuleCode: rule.code,
            quantity: baseRow.quantity,
            evidencePath: storagePath,
            evidenceOriginalName: originalName,
            evidenceContentType: file.mimetype,
            evidenceSize: file.size,
            status: DECLARATION_STATUS.DRAFT,
            aiConfidence: typeof parsed.confidence === 'number' ? parsed.confidence : null,
            aiRawResult: { source: 'teaching_assignment_import', model: parsed.model, assignment },
            aiProcessedAt: new Date(),
          },
        });

        try {
          const calculated = await this.ruleEngine.calculate(declaration.id);
          await this.prisma.declarations.update({
            where: { id: declaration.id },
            data: {
              status: DECLARATION_STATUS.APPROVED,
              submittedAt: new Date(),
              reviewedAt: new Date(),
              reviewedById: BigInt(managerId),
            },
          });
          importedCount += 1;
          baseRow.status = 'IMPORTED';
          baseRow.calculatedHours = calculated.calculatedHours;
          baseRow.message = 'Đã tạo và duyệt kết quả cho giảng viên';
          existing.push({ name, calculatedHours: calculated.calculatedHours });
        } catch (error: any) {
          await this.prisma.declarations.delete({ where: { id: declaration.id } });
          baseRow.status = 'FAILED';
          baseRow.message = error?.message || 'Không thể tính giờ cho dòng phân công';
        }
        results.push(serializeRow(baseRow));
      }
    } catch (error) {
      await unlink(storagePath).catch(() => undefined);
      throw error;
    }

    return {
      academicYear: { id: academicYear.id.toString(), name: academicYear.name },
      fileName: originalName,
      model: parsed.model ?? 'TeachingAssignmentParser',
      parserConfidence: parsed.confidence ?? null,
      needsReview: Boolean(parsed.needs_review) || unmatchedCount > 0,
      warnings: parsed.warnings ?? [],
      rowCount: results.length,
      lecturerCount,
      guidanceCount: guidanceAssignments.length,
      importedCount,
      skippedCount,
      unmatchedCount,
      rows: results,
    };
  }
}
