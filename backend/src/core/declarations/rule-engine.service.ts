import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common';

const toFraction = (value: number) => (value > 1 ? value / 100 : value);

type RuleConditions = {
  capGroup?: string;
  maxTotalHours?: number;
  minimumHours?: number;
};

const readConditions = (value: string | null): RuleConditions => {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as RuleConditions;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

@Injectable()
export class DeclarationRuleEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(declarationId: bigint) {
    const declaration = await this.prisma.declarations.findUnique({
      where: { id: declarationId },
      include: {
        source: { include: { classification: true } },
        authors: true,
        appliedRule: true,
      },
    });

    if (!declaration) throw new NotFoundException('Declaration not found');

    const now = new Date();
    const rules = await this.prisma.conversion_rules.findMany({
      where: { activityType: declaration.activityType },
    });

    const classificationId = declaration.source?.classificationId?.toString();
    const academicYearId = declaration.academicYearId.toString();
    const applicableRules = rules.filter((rule) => {
      const fromOk = !rule.effectiveFrom || rule.effectiveFrom <= now;
      const toOk = !rule.effectiveTo || rule.effectiveTo >= now;
      const yearOk = !rule.academicYearId || rule.academicYearId.toString() === academicYearId;
      const classificationOk =
        !rule.classificationId || rule.classificationId.toString() === classificationId;
      const codeOk =
        !declaration.conversionRuleCode || rule.code === declaration.conversionRuleCode;
      return fromOk && toOk && yearOk && classificationOk && codeOk;
    });

    const rule = applicableRules.sort((a, b) => {
      const score = (item: typeof a) =>
        (item.academicYearId ? 4 : 0) + (item.classificationId ? 4 : 0) + item.priority;
      return score(b) - score(a);
    })[0];

    if (!rule) {
      throw new NotFoundException(
        `No conversion rule found for activity ${declaration.activityType}`,
      );
    }

    const conditions = readConditions(rule.conditions);
    const minimumHours = rule.minHours ?? conditions.minimumHours;
    const maximumHours = rule.maxHours;

    if (minimumHours !== null && minimumHours !== undefined && rule.hours < minimumHours) {
      throw new BadRequestException(
        `Conversion rule ${rule.code ?? rule.id.toString()} is below its minimum of ${minimumHours} hours`,
      );
    }

    if (maximumHours !== null && maximumHours !== undefined && rule.hours > maximumHours) {
      throw new BadRequestException(
        `Conversion rule ${rule.code ?? rule.id.toString()} exceeds its maximum of ${maximumHours} hours`,
      );
    }

    const calculatedHours = rule.hours * declaration.quantity;

    if (conditions.maxTotalHours !== undefined) {
      const existingDeclarations = await this.prisma.declarations.findMany({
        where: {
          userId: declaration.userId,
          academicYearId: declaration.academicYearId,
          id: { not: declaration.id },
          status: { not: 'REJECTED' },
          calculatedHours: { not: null },
        },
        select: {
          calculatedHours: true,
          appliedRuleId: true,
          appliedRule: { select: { conditions: true } },
        },
      });

      const usedHours = existingDeclarations.reduce((sum, item) => {
        const itemConditions = readConditions(item.appliedRule?.conditions ?? null);
        const sameGroup = conditions.capGroup
          ? itemConditions.capGroup === conditions.capGroup
          : item.appliedRuleId === rule.id;
        return sameGroup ? sum + (item.calculatedHours ?? 0) : sum;
      }, 0);

      if (usedHours + calculatedHours > conditions.maxTotalHours + 0.01) {
        throw new BadRequestException(
          `The rule limit is ${conditions.maxTotalHours} hours per academic year; ` +
            `${usedHours} hours have already been calculated and this declaration adds ${calculatedHours} hours`,
        );
      }
    }

    const allocationRules = declaration.authors.length
      ? await this.prisma.author_allocation_rules.findMany({
          where: { roleType: { in: declaration.authors.map((author) => author.roleType) } },
        })
      : [];

    const ruleByRole = new Map(
      allocationRules.map((item) => [item.roleType, toFraction(item.percentage)]),
    );
    const hasManualAllocations = declaration.authors.some(
      (author) => author.allocationPercentage !== null,
    );
    let percentages: Array<number | undefined>;

    if (hasManualAllocations) {
      if (declaration.authors.some((author) => author.allocationPercentage === null)) {
        throw new BadRequestException('Every author must have a contribution percentage');
      }
      const total = declaration.authors.reduce(
        (sum, author) => sum + (author.allocationPercentage ?? 0),
        0,
      );
      if (Math.abs(total - 100) > 0.01) {
        throw new BadRequestException('Author contribution percentages must total 100');
      }
      percentages = declaration.authors.map((author) => (author.allocationPercentage ?? 0) / 100);
    } else {
      percentages = declaration.authors.map((author) => ruleByRole.get(author.roleType));
    }

    if (!percentages.length || percentages.every((value) => value === undefined)) {
      percentages = percentages.map(() => 1 / declaration.authors.length);
    } else {
      const assigned = percentages.reduce<number>((sum, value) => sum + (value ?? 0), 0);
      const missingCount = percentages.filter((value) => value === undefined).length;

      if (missingCount > 0) {
        const remaining = Math.max(0, 1 - assigned) / missingCount;
        percentages = percentages.map((value) => value ?? remaining);
      } else if (assigned > 0) {
        percentages = percentages.map((value) => (value ?? 0) / assigned);
      }
    }

    const snapshot = {
      ruleId: rule.id.toString(),
      activityType: rule.activityType,
      hours: rule.hours,
      minHours: rule.minHours,
      maxHours: rule.maxHours,
      conditions,
      priority: rule.priority,
      classificationId: rule.classificationId?.toString() ?? null,
      academicYearId: rule.academicYearId?.toString() ?? null,
      calculatedAt: now.toISOString(),
      allocations: declaration.authors.map((author, index) => ({
        authorId: author.id.toString(),
        percentage: (percentages[index] ?? 0) * 100,
      })),
    };

    await this.prisma.$transaction([
      this.prisma.declarations.update({
        where: { id: declaration.id },
        data: {
          calculatedHours,
          appliedRuleId: rule.id,
          appliedRuleSnapshot: snapshot,
        },
      }),
      ...declaration.authors.map((author, index) =>
        this.prisma.declaration_authors.update({
          where: { id: author.id },
          data: {
            allocationPercentage: (percentages[index] ?? 0) * 100,
            allocatedHours: calculatedHours * (percentages[index] ?? 0),
          },
        }),
      ),
    ]);

    return this.prisma.declarations.findUniqueOrThrow({
      where: { id: declaration.id },
      include: {
        academicYear: true,
        source: { include: { classification: true } },
        authors: true,
        appliedRule: true,
      },
    });
  }
}
