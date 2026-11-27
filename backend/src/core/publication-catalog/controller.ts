import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { extname } from 'node:path';
import { ROLE } from '@projectname/shared';
import { Roles } from '@/common';
import { CreatePublicationClassificationDto } from './dto/create-classification';
import { CreatePublicationSourceDto } from './dto/create-source';
import { UpdatePublicationSourceDto } from './dto/update-source';
import { PublicationCatalogService } from './service';

@Controller('publication-catalog')
@ApiBearerAuth()
@Roles(ROLE.Staff, ROLE.Admin)
export class PublicationCatalogController {
  constructor(private readonly publicationCatalogService: PublicationCatalogService) {}

  @Get('classifications')
  listClassifications() {
    return this.publicationCatalogService.listClassifications();
  }

  @Post('classifications')
  @Roles(ROLE.Admin)
  createClassification(@Body() dto: CreatePublicationClassificationDto) {
    return this.publicationCatalogService.createClassification(dto);
  }

  @Get('sources')
  @ApiQuery({ name: 'classificationId', required: false })
  listSources(@Query('classificationId') classificationId?: string) {
    return this.publicationCatalogService.listSources(classificationId);
  }

  @Post('sources')
  @Roles(ROLE.Admin)
  createSource(@Body() dto: CreatePublicationSourceDto) {
    return this.publicationCatalogService.createSource(dto);
  }

  @Post('rankings/import')
  @Roles(ROLE.Admin)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        if (extname(file.originalname).toLowerCase() !== '.csv') {
          callback(new BadRequestException('Chỉ hỗ trợ file xếp hạng .csv'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  importRanking(@UploadedFile() file?: Express.Multer.File) {
    return this.publicationCatalogService.importRankingCsv(file);
  }

  @Patch('sources/:id')
  @Roles(ROLE.Admin)
  updateSource(@Param('id') id: string, @Body() dto: UpdatePublicationSourceDto) {
    return this.publicationCatalogService.updateSource(id, dto);
  }
}
