import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/common';
import { CreateConversionRuleDto } from './dto/create';

const idOf = (value: string | undefined, field: string) => {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value)) throw new BadRequestException(`${field} must be a numeric id`);
  return BigInt(value);
};

const serialize = (rule: any) => ({
  ...rule,
  id: rule.id.toString(),
  classificationId: rule.classificationId?.toString() ?? null,
  academicYearId: rule.academicYearId?.toString() ?? null,
  classification: rule.classification
    ? { ...rule.classification, id: rule.classification.id.toString() }
    : rule.classification,
  academicYear: rule.academicYear
    ? { ...rule.academicYear, id: rule.academicYear.id.toString() }
    : rule.academicYear,
});

@Injectable()
export class ConversionRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { activityType?: string; academicYearId?: string }) {
    const rules = await this.prisma.conversion_rules.findMany({
      where: {
        activityType: params.activityType,
        academicYearId: idOf(params.academicYearId, 'academicYearId'),
      },
      include: { classification: true, academicYear: true },
      orderBy: [{ priority: 'desc' }, { id: 'desc' }],
    });

    return rules.map(serialize);
  }

  async create(dto: CreateConversionRuleDto) {
    const rule = await this.prisma.conversion_rules.create({
      data: {
        code: dto.code,
        label: dto.label,
        activityType: dto.activityType,
        unit: dto.unit,
        minHours: dto.minHours,
        maxHours: dto.maxHours,
        classificationId: idOf(dto.classificationId, 'classificationId'),
        academicYearId: idOf(dto.academicYearId, 'academicYearId'),
        hours: dto.hours,
        priority: dto.priority ?? 0,
        conditions: dto.conditions,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      },
      include: { classification: true, academicYear: true },
    });

    return serialize(rule);
  }
}
