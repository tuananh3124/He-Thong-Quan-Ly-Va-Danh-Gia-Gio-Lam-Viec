import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DECLARATION_STATUS, ROLE, ROLE_TYPE } from '@projectname/shared';
import { PrismaService } from '@/common';
import { CreateDeclarationDto } from './dto/create';
import { ReviewDeclarationDto } from './dto/review';
import { DeclarationRuleEngineService } from './rule-engine.service';

const parseId = (value: string, field: string) => {
  if (!/^\d+$/.test(value)) throw new BadRequestException(`${field} must be a numeric id`);
  return BigInt(value);
};

const serialize = (declaration: any) => ({
  ...declaration,
  id: declaration.id.toString(),
  userId: declaration.userId.toString(),
  academicYearId: declaration.academicYearId.toString(),
  sourceId: declaration.sourceId?.toString() ?? null,
  reviewedById: declaration.reviewedById?.toString() ?? null,
  appliedRuleId: declaration.appliedRuleId?.toString() ?? null,
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
});

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
    const declarations = await this.prisma.declarations.findMany({
      where: {
        userId: role === ROLE.Admin ? undefined : parseId(userId, 'userId'),
        status,
      },
      include: {
        academicYear: true,
        source: { include: { classification: true } },
        authors: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return declarations.map(serialize);
  }

  async create(userId: string, dto: CreateDeclarationDto) {
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
        url: dto.url,
        sourceId,
        status: DECLARATION_STATUS.DRAFT,
        authors: dto.authors?.length
          ? {
              create: dto.authors.map((author) => ({
                authorName: author.authorName,
                roleType: author.roleType,
                userId: author.userId ? parseId(author.userId, 'author.userId') : undefined,
              })),
            }
          : undefined,
      },
      include: {
        academicYear: true,
        source: { include: { classification: true } },
        authors: true,
      },
    });

    return serialize(declaration);
  }

  async get(idValue: string, userId: string, role: ROLE_TYPE) {
    const declaration = await this.findById(parseId(idValue, 'id'));
    if (!declaration) throw new NotFoundException('Declaration not found');
    this.assertOwner(declaration, userId, role);
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

  async review(idValue: string, reviewerId: string, dto: ReviewDeclarationDto) {
    const id = parseId(idValue, 'id');
    const declaration = await this.findById(id);
    if (!declaration) throw new NotFoundException('Declaration not found');
    if (declaration.status !== DECLARATION_STATUS.SUBMITTED) {
      throw new BadRequestException('Only submitted declarations can be reviewed');
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
}
