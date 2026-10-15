import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DECLARATION_STATUS, ROLE, ROLE_TYPE } from '@projectname/shared';
import { PrismaService } from '@/common';
import { CreateDeclarationDto } from './dto/create';
import { ReviewDeclarationDto } from './dto/review';
import { DeclarationRuleEngineService } from './rule-engine.service';

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
        user: { select: { id: true, name: true, email: true, academicTitle: true } },
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

  async create(userId: string, dto: CreateDeclarationDto) {
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
    return serialize(await this.ruleEngine.calculate(id));
  }

  async submit(idValue: string, userId: string, role: ROLE_TYPE) {
    const id = parseId(idValue, 'id');
    const declaration = await this.findById(id);
    if (!declaration) throw new NotFoundException('Declaration not found');
    this.assertOwner(declaration, userId, role);

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
