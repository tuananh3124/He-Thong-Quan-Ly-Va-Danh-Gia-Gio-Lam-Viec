import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import axios from 'axios';
import { ACTIVITY_TYPE, DECLARATION_STATUS, ROLE, ROLE_TYPE, STAFF_CATEGORY } from '@projectname/shared';
import { PrismaService } from '@/common';
import { CreateDeclarationDto } from './dto/create';
import { ReviewDeclarationDto } from './dto/review';
import { DeclarationRuleEngineService } from './rule-engine.service';
import { getEnv } from '@/utils';

const parseId = (value: string, field: string) => {
  if (!/^\d+$/.test(value)) throw new BadRequestException(`${field} must be a numeric id`);
  return BigInt(value);
};

const serialize = (declaration: any) => {
  const { evidencePath, ...publicDeclaration } = declaration;
  return {
    ...publicDeclaration,
    hasEvidence: Boolean(evidencePath),
    id: declaration.id.toString(),
    userId: declaration.userId.toString(),
    academicYearId: declaration.academicYearId.toString(),
    sourceId: declaration.sourceId?.toString() ?? null,
    reviewedById: declaration.reviewedById?.toString() ?? null,
    appliedRuleId: declaration.appliedRuleId?.toString() ?? null,
    user: declaration.user
      ? {
          ...declaration.user,
          id: declaration.user.id.toString(),
        }
      : declaration.user,
    academicYear: declaration.academicYear
      ? {
          ...declaration.academicYear,
          id: declaration.academicYear.id.toString(),
        }
      : declaration.academicYear,
    source: declaration.source
      ? {
          ...declaration.source,
          id: declaration.source.id.toString(),
          classificationId: declaration.source.classificationId.toString(),
          classification: declaration.source.classification
            ? {
                ...declaration.source.classification,
                id: declaration.source.classification.id.toString(),
              }
            : declaration.source.classification,
        }
      : declaration.source,
    appliedRule: declaration.appliedRule
      ? {
          ...declaration.appliedRule,
          id: declaration.appliedRule.id.toString(),
          classificationId: declaration.appliedRule.classificationId?.toString() ?? null,
          academicYearId: declaration.appliedRule.academicYearId?.toString() ?? null,
        }
      : declaration.appliedRule,
    authors: declaration.authors?.map((author: any) => ({
      ...author,
      id: author.id.toString(),
      declarationId: author.declarationId.toString(),
      userId: author.userId?.toString() ?? null,
    })),
  };
};

@Injectable()
export class DeclarationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ruleEngine: DeclarationRuleEngineService,
  ) {}

  private async findById(id: bigint) {
    return this.prisma.declarations.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, academicTitle: true, staffCategory: true } },
        academicYear: true,
        source: { include: { classification: true } },
        authors: true,
        appliedRule: true,
      },
    });
  }

  private assertOwner(declaration: { userId: bigint }, userId: string, role: ROLE_TYPE) {
    if (role !== ROLE.Admin && declaration.userId.toString() !== userId) {
      throw new ForbiddenException('You cannot modify this declaration');
    }
  }

  private async assertActivityAllowed(userId: string, activityType: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: parseId(userId, 'userId') },
      select: { role: true, staffCategory: true },
    });
    if (
      user?.role === ROLE.Staff &&
      user.staffCategory === STAFF_CATEGORY.Researcher &&
      activityType !== ACTIVITY_TYPE.RESEARCH
    ) {
      throw new ForbiddenException('Nghiên cứu viên chỉ được kê khai hoạt động nghiên cứu khoa học');
    }
    if (
      user?.role === ROLE.Staff &&
      user.staffCategory === STAFF_CATEGORY.Lecturer &&
      ![ACTIVITY_TYPE.RESEARCH, ACTIVITY_TYPE.TEACHING].includes(activityType as any)
    ) {
      throw new ForbiddenException('Giảng viên chỉ được kê khai hoạt động nghiên cứu và giảng dạy');
    }
  }

  private async analyzeEvidence(storagePath: string, originalName: string) {
    const serviceUrl = getEnv('AI_SERVICE_URL');
    if (!serviceUrl) return null;
    try {
      const buffer = await readFile(storagePath);
      const form = new FormData();
      form.append('file', new Blob([buffer], { type: 'application/pdf' }), originalName);
      const response = await axios.post(`${serviceUrl.replace(/\/$/, '')}/analyze`, form, {
        timeout: 120_000,
      });
      return response.data;
    } catch {
      // Uploading evidence must remain available when the optional AI service is down.
      return null;
    }
  }

  async list(userId: string, role: ROLE_TYPE, status?: string) {
    const where: any = { status };

    if (role === ROLE.Manager) {
      if (status === DECLARATION_STATUS.DRAFT) return [];
      const tenantId = await this.managerTenantId(userId);
      const tenantUsers = await this.prisma.users.findMany({
        where: { tenantId },
        select: { id: true },
      });
      where.userId = { in: tenantUsers.map((user) => user.id) };
      where.status = status ?? {
        in: [DECLARATION_STATUS.SUBMITTED, DECLARATION_STATUS.APPROVED, DECLARATION_STATUS.REJECTED],
      };
    } else {
      where.userId = role === ROLE.Admin ? undefined : parseId(userId, 'userId');
    }

    const declarations = await this.prisma.declarations.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, academicTitle: true } },
        academicYear: true,
        source: { include: { classification: true } },
        authors: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return declarations.map(serialize);
  }

  async managerSummary(userId: string, role: ROLE_TYPE) {
    let where: any = {};
    if (role === ROLE.Manager) {
      const tenantId = await this.managerTenantId(userId);
      where = { user: { tenantId } };
    } else if (role !== ROLE.Admin) {
      throw new ForbiddenException('Only managers can access this report');
    }

    const declarations = await this.prisma.declarations.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, staffCategory: true, department: true, room: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const statuses = {
      total: declarations.length,
      draft: declarations.filter((item) => item.status === DECLARATION_STATUS.DRAFT).length,
      submitted: declarations.filter((item) => item.status === DECLARATION_STATUS.SUBMITTED).length,
      approved: declarations.filter((item) => item.status === DECLARATION_STATUS.APPROVED).length,
      rejected: declarations.filter((item) => item.status === DECLARATION_STATUS.REJECTED).length,
      calculatedHours: declarations.reduce((sum, item) => sum + (item.calculatedHours ?? 0), 0),
    };

    const staffMap = new Map<string, any>();
    const activityMap = new Map<string, any>();
    const departmentMap = new Map<string, any>();
    const roomMap = new Map<string, any>();
    for (const item of declarations) {
      const staffId = item.user.id.toString();
      const staff = staffMap.get(staffId) ?? {
        id: staffId,
        name: item.user.name,
        email: item.user.email,
        staffCategory: item.user.staffCategory,
        department: item.user.department,
        room: item.user.room,
        declarationCount: 0,
        calculatedHours: 0,
        submittedCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
      };
      staff.declarationCount += 1;
      staff.calculatedHours += item.calculatedHours ?? 0;
      if (item.status === DECLARATION_STATUS.SUBMITTED) staff.submittedCount += 1;
      if (item.status === DECLARATION_STATUS.APPROVED) staff.approvedCount += 1;
      if (item.status === DECLARATION_STATUS.REJECTED) staff.rejectedCount += 1;
      staffMap.set(staffId, staff);

      const department = item.user.department || 'Chưa phân khoa';
      const departmentItem = departmentMap.get(department) ?? {
        department,
        declarationCount: 0,
        calculatedHours: 0,
      };
      departmentItem.declarationCount += 1;
      departmentItem.calculatedHours += item.calculatedHours ?? 0;
      departmentMap.set(department, departmentItem);

      const room = item.user.room || 'Chưa phân phòng/bộ môn';
      const roomItem = roomMap.get(room) ?? {
        room,
        declarationCount: 0,
        calculatedHours: 0,
      };
      roomItem.declarationCount += 1;
      roomItem.calculatedHours += item.calculatedHours ?? 0;
      roomMap.set(room, roomItem);

      const activity = activityMap.get(item.activityType) ?? {
        activityType: item.activityType,
        declarationCount: 0,
        calculatedHours: 0,
      };
      activity.declarationCount += 1;
      activity.calculatedHours += item.calculatedHours ?? 0;
      activityMap.set(item.activityType, activity);
    }

    return {
      totals: statuses,
      staff: [...staffMap.values()].sort((a, b) => b.calculatedHours - a.calculatedHours),
      activities: [...activityMap.values()].sort((a, b) => b.calculatedHours - a.calculatedHours),
      departments: [...departmentMap.values()].sort((a, b) => b.calculatedHours - a.calculatedHours),
      rooms: [...roomMap.values()].sort((a, b) => b.calculatedHours - a.calculatedHours),
    };
  }

  async create(userId: string, dto: CreateDeclarationDto) {
    await this.assertActivityAllowed(userId, dto.activityType);
    this.validateAuthorAllocations(dto.authors);
    const academicYearId = parseId(dto.academicYearId, 'academicYearId');
    const sourceId = dto.sourceId ? parseId(dto.sourceId, 'sourceId') : undefined;

    const academicYear = await this.prisma.academic_years.findUnique({
      where: { id: academicYearId },
    });
    if (!academicYear) throw new NotFoundException('Academic year not found');

    if (sourceId) {
      const source = await this.prisma.publication_sources.findUnique({ where: { id: sourceId } });
      if (!source) throw new NotFoundException('Publication source not found');
    }

    const declaration = await this.prisma.declarations.create({
      data: {
        userId: parseId(userId, 'userId'),
        academicYearId,
        activityType: dto.activityType,
        name: dto.name,
        conversionRuleCode: dto.conversionRuleCode?.trim() || null,
        quantity: dto.quantity ?? 1,
        publicationYear: dto.publicationYear,
        doi: dto.doi?.trim() || undefined,
        url: dto.url,
        sourceId: sourceId ?? null,
        status: DECLARATION_STATUS.DRAFT,
        authors: dto.authors?.length
          ? {
              create: dto.authors.map((author) => ({
                authorName: author.authorName,
                roleType: author.roleType,
                userId: author.userId ? parseId(author.userId, 'author.userId') : undefined,
                allocationPercentage: author.allocationPercentage ?? undefined,
              })),
            }
          : undefined,
      },
      include: {
        user: { select: { id: true, name: true, email: true, academicTitle: true } },
        academicYear: true,
        source: { include: { classification: true } },
        authors: true,
      },
    });

    return serialize(declaration);
  }

  async update(idValue: string, userId: string, role: ROLE_TYPE, dto: CreateDeclarationDto) {
    const id = parseId(idValue, 'id');
    const declaration = await this.findById(id);
    if (!declaration) throw new NotFoundException('Declaration not found');
    this.assertOwner(declaration, userId, role);
    await this.assertActivityAllowed(userId, dto.activityType);
    if (![DECLARATION_STATUS.DRAFT, DECLARATION_STATUS.REJECTED].includes(declaration.status as any)) {
      throw new BadRequestException('Only draft or rejected declarations can be edited');
    }
    this.validateAuthorAllocations(dto.authors);

    const academicYearId = parseId(dto.academicYearId, 'academicYearId');
    const sourceId = dto.sourceId ? parseId(dto.sourceId, 'sourceId') : null;
    const academicYear = await this.prisma.academic_years.findUnique({ where: { id: academicYearId } });
    if (!academicYear) throw new NotFoundException('Academic year not found');
    if (sourceId) {
      const source = await this.prisma.publication_sources.findUnique({ where: { id: sourceId } });
      if (!source) throw new NotFoundException('Publication source not found');
    }

    await this.prisma.declarations.update({
      where: { id },
      data: {
        activityType: dto.activityType,
        name: dto.name,
        conversionRuleCode: dto.conversionRuleCode?.trim() || null,
        quantity: dto.quantity ?? 1,
        publicationYear: dto.publicationYear ?? null,
        doi: dto.doi?.trim() || null,
        url: dto.url?.trim() || null,
        academicYearId,
        sourceId,
        calculatedHours: null,
        appliedRuleId: null,
        appliedRuleSnapshot: {},
        authors: {
          deleteMany: {},
          create: (dto.authors ?? []).map((author) => ({
            authorName: author.authorName,
            roleType: author.roleType,
            userId: author.userId ? parseId(author.userId, 'author.userId') : undefined,
            allocationPercentage: author.allocationPercentage ?? undefined,
          })),
        },
      },
    });

    return serialize(await this.findById(id));
  }

  private validateAuthorAllocations(authors?: CreateDeclarationDto['authors']) {
    if (!authors?.length) return;
    const specified = authors.filter((author) => author.allocationPercentage != null);
    if (!specified.length) return;
    if (specified.length !== authors.length) {
      throw new BadRequestException('Enter a contribution percentage for every author or leave all blank');
    }
    const total = specified.reduce((sum, author) => sum + (author.allocationPercentage ?? 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      throw new BadRequestException('Author contribution percentages must total 100');
    }
  }

  async uploadEvidence(
    idValue: string,
    userId: string,
    role: ROLE_TYPE,
    file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('A PDF evidence file is required');
    if (file.buffer.subarray(0, 5).toString() !== '%PDF-') {
      throw new BadRequestException('The uploaded file is not a valid PDF');
    }

    const id = parseId(idValue, 'id');
    const declaration = await this.findById(id);
    if (!declaration) throw new NotFoundException('Declaration not found');
    this.assertOwner(declaration, userId, role);
    if (![DECLARATION_STATUS.DRAFT, DECLARATION_STATUS.REJECTED].includes(declaration.status as any)) {
      throw new BadRequestException('Evidence can only be changed on draft or rejected declarations');
    }

    const storageDirectory = join(process.cwd(), 'uploads', 'evidence');
    const storagePath = join(storageDirectory, `${randomUUID()}.pdf`);
    const originalName = file.originalname.replace(/[\\/]/g, '_').slice(0, 255) || 'evidence.pdf';
    await mkdir(storageDirectory, { recursive: true });
    await writeFile(storagePath, file.buffer, { flag: 'wx' });

    try {
      await this.prisma.declarations.update({
        where: { id },
        data: {
          evidencePath: storagePath,
          evidenceOriginalName: originalName,
          evidenceContentType: 'application/pdf',
          evidenceSize: file.size,
        },
      });
    } catch (error) {
      await unlink(storagePath).catch(() => undefined);
      throw error;
    }

    const aiResult = await this.analyzeEvidence(storagePath, originalName);
    if (aiResult) {
      await this.prisma.declarations.update({
        where: { id },
        data: {
          aiConfidence: typeof aiResult.confidence === 'number' ? aiResult.confidence : null,
          aiRawResult: aiResult,
          aiProcessedAt: new Date(),
        },
      });
    }

    if (declaration.evidencePath) await unlink(declaration.evidencePath).catch(() => undefined);
    return serialize(await this.findById(id));
  }

  async getEvidence(idValue: string, userId: string, role: ROLE_TYPE) {
    const declaration = await this.findById(parseId(idValue, 'id'));
    if (!declaration) throw new NotFoundException('Declaration not found');
    await this.assertCanRead(declaration, userId, role);
    if (!declaration.evidencePath || !declaration.evidenceOriginalName) {
      throw new NotFoundException('No evidence file is attached');
    }
    try {
      await access(declaration.evidencePath);
    } catch {
      throw new NotFoundException('Evidence file is unavailable');
    }
    return {
      path: declaration.evidencePath,
      originalName: declaration.evidenceOriginalName,
      contentType: declaration.evidenceContentType ?? 'application/pdf',
    };
  }

  async get(idValue: string, userId: string, role: ROLE_TYPE) {
    const declaration = await this.findById(parseId(idValue, 'id'));
    if (!declaration) throw new NotFoundException('Declaration not found');
    await this.assertCanRead(declaration, userId, role);
    return serialize(declaration);
  }

  async calculate(idValue: string, userId: string, role: ROLE_TYPE) {
    const id = parseId(idValue, 'id');
    const declaration = await this.findById(id);
    if (!declaration) throw new NotFoundException('Declaration not found');
    this.assertOwner(declaration, userId, role);
    await this.assertActivityAllowed(declaration.userId.toString(), declaration.activityType);
    return serialize(await this.ruleEngine.calculate(id));
  }

  async submit(idValue: string, userId: string, role: ROLE_TYPE) {
    const id = parseId(idValue, 'id');
    const declaration = await this.findById(id);
    if (!declaration) throw new NotFoundException('Declaration not found');
    this.assertOwner(declaration, userId, role);
    await this.assertActivityAllowed(declaration.userId.toString(), declaration.activityType);

    if (
      ![DECLARATION_STATUS.DRAFT, DECLARATION_STATUS.REJECTED].includes(declaration.status as any)
    ) {
      throw new BadRequestException('Only draft or rejected declarations can be submitted');
    }

    await this.ruleEngine.calculate(id);
    const updated = await this.prisma.declarations.update({
      where: { id },
      data: {
        status: DECLARATION_STATUS.SUBMITTED,
        submittedAt: new Date(),
        rejectionReason: null,
      },
    });

    return this.get(updated.id.toString(), userId, role);
  }

  async review(
    idValue: string,
    reviewerId: string,
    reviewerRole: ROLE_TYPE,
    dto: ReviewDeclarationDto,
  ) {
    const id = parseId(idValue, 'id');
    const declaration = await this.findById(id);
    if (!declaration) throw new NotFoundException('Declaration not found');
    if (declaration.status !== DECLARATION_STATUS.SUBMITTED) {
      throw new BadRequestException('Only submitted declarations can be reviewed');
    }
    if (reviewerRole === ROLE.Manager) {
      if (declaration.userId.toString() === reviewerId) {
        throw new ForbiddenException('Managers cannot review their own declarations');
      }
      const managerTenantId = await this.managerTenantId(reviewerId);
      const owner = await this.prisma.users.findUnique({
        where: { id: declaration.userId },
        select: { tenantId: true },
      });
      if (!owner?.tenantId || owner.tenantId !== managerTenantId) {
        throw new ForbiddenException('You cannot review declarations outside your tenant');
      }
    } else if (reviewerRole !== ROLE.Admin) {
      throw new ForbiddenException('You cannot review declarations');
    }
    if (dto.decision === 'REJECTED' && !dto.reason?.trim()) {
      throw new BadRequestException('A rejection reason is required');
    }

    const updated = await this.prisma.declarations.update({
      where: { id },
      data: {
        status: dto.decision,
        reviewedAt: new Date(),
        reviewedById: parseId(reviewerId, 'reviewerId'),
        rejectionReason: dto.decision === 'REJECTED' ? dto.reason : null,
      },
      include: {
        academicYear: true,
        source: { include: { classification: true } },
        authors: true,
        appliedRule: true,
      },
    });

    return serialize(updated);
  }

  private async managerTenantId(managerId: string) {
    const manager = await this.prisma.users.findUnique({
      where: { id: parseId(managerId, 'managerId') },
      select: { tenantId: true },
    });
    if (!manager?.tenantId) {
      throw new ForbiddenException('Manager must belong to a tenant');
    }
    return manager.tenantId;
  }

  private async assertCanRead(
    declaration: { userId: bigint; status: string },
    userId: string,
    role: ROLE_TYPE,
  ) {
    if (role === ROLE.Admin || declaration.userId.toString() === userId) return;
    if (role !== ROLE.Manager || declaration.status === DECLARATION_STATUS.DRAFT) {
      throw new ForbiddenException('You cannot access this declaration');
    }

    const tenantId = await this.managerTenantId(userId);
    const owner = await this.prisma.users.findUnique({
      where: { id: declaration.userId },
      select: { tenantId: true },
    });
    if (!owner?.tenantId || owner.tenantId !== tenantId) {
      throw new ForbiddenException('You cannot access declarations outside your tenant');
    }
  }
}
