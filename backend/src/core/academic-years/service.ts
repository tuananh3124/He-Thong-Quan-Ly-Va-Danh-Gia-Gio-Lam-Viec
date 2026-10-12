import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/common';
import { CreateAcademicYearDto } from './dto/create';

const serialize = (year: any) => ({
  ...year,
  id: year.id.toString(),
});

@Injectable()
export class AcademicYearsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(activeOnly = false) {
    const years = await this.prisma.academic_years.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { startDate: 'desc' },
    });

    return years.map(serialize);
  }

  async create(dto: CreateAcademicYearDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('endDate must be after startDate');
    }

    const year = await this.prisma.academic_years.create({
      data: {
        name: dto.name,
        startDate,
        endDate,
        isActive: dto.isActive ?? true,
      },
    });

    return serialize(year);
  }
}
