import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common';

const toFraction = (value: number) => (value > 1 ? value / 100 : value);

@Injectable()
export class DeclarationRuleEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(declarationId: bigint) {
    const declaration = await this.prisma.declarations.findUnique({
      where: { id: declarationId },
      include: {
        source: { include: { classification: true } },
        authors: true,
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
      return fromOk && toOk && yearOk && classificationOk;
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
          calculatedHours: rule.hours,
          appliedRuleId: rule.id,
          appliedRuleSnapshot: snapshot,
        },
      }),
      ...declaration.authors.map((author, index) =>
        this.prisma.declaration_authors.update({
          where: { id: author.id },
          data: {
            allocationPercentage: (percentages[index] ?? 0) * 100,
            allocatedHours: rule.hours * (percentages[index] ?? 0),
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
