import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/common';
import { CreatePublicationClassificationDto } from './dto/create-classification';
import { CreatePublicationSourceDto } from './dto/create-source';

const parseId = (value: string, field: string) => {
  if (!/^\d+$/.test(value)) throw new BadRequestException(`${field} must be a numeric id`);
  return BigInt(value);
};

const serialize = (value: any) => ({
  ...value,
  id: value.id.toString(),
  classificationId: value.classificationId?.toString(),
  classification: value.classification
    ? {
        ...value.classification,
        id: value.classification.id.toString(),
      }
    : value.classification,
});

@Injectable()
export class PublicationCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listClassifications() {
    const items = await this.prisma.publication_classifications.findMany({
      include: { sources: true },
      orderBy: { name: 'asc' },
    });

    return items.map((item) => ({
      ...serialize(item),
      sources: item.sources.map(serialize),
    }));
  }

  async createClassification(dto: CreatePublicationClassificationDto) {
    return serialize(
      await this.prisma.publication_classifications.create({
        data: { name: dto.name, description: dto.description },
      }),
    );
  }

  async listSources(classificationId?: string) {
    const items = await this.prisma.publication_sources.findMany({
      where: classificationId
        ? { classificationId: parseId(classificationId, 'classificationId') }
        : undefined,
      include: { classification: true },
      orderBy: { name: 'asc' },
    });

    return items.map(serialize);
  }

  async createSource(dto: CreatePublicationSourceDto) {
    return serialize(
      await this.prisma.publication_sources.create({
        data: {
          name: dto.name,
          classificationId: parseId(dto.classificationId, 'classificationId'),
        },
        include: { classification: true },
      }),
    );
  }
}
