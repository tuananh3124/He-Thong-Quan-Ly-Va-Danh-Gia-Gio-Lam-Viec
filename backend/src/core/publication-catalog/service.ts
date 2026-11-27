import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '@/common';
import { getEnv } from '@/utils';
import { CreatePublicationClassificationDto } from './dto/create-classification';
import { CreatePublicationSourceDto } from './dto/create-source';
import { UpdatePublicationSourceDto } from './dto/update-source';

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

  async importRankingCsv(file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn file xếp hạng .csv');
    const serviceUrl = getEnv('AI_SERVICE_URL');
    if (!serviceUrl) throw new BadRequestException('AI service chưa được cấu hình');
    try {
      const form = new FormData();
      form.append('file', new Blob([new Uint8Array(file.buffer)], { type: 'text/csv' }), file.originalname);
      const response = await axios.post(`${serviceUrl.replace(/\/$/, '')}/rankings/import`, form, {
        timeout: 120_000,
      });
      return response.data;
    } catch (error: any) {
      const detail = error?.response?.data?.detail || 'Không thể cập nhật dữ liệu xếp hạng từ CSV';
      throw new BadRequestException(detail);
    }
  }

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
          quartile: dto.quartile || null,
        },
        include: { classification: true },
      }),
    );
  }

  async updateSource(idValue: string, dto: UpdatePublicationSourceDto) {
    const id = parseId(idValue, 'id');
    return serialize(
      await this.prisma.publication_sources.update({
        where: { id },
        data: {
          name: dto.name,
          classificationId: dto.classificationId
            ? parseId(dto.classificationId, 'classificationId')
            : undefined,
          quartile: dto.quartile,
        },
        include: { classification: true },
      }),
    );
  }
}
