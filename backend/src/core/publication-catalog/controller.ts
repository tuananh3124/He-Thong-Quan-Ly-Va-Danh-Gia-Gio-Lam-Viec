import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ROLE } from '@projectname/shared';
import { Roles } from '@/common';
import { CreatePublicationClassificationDto } from './dto/create-classification';
import { CreatePublicationSourceDto } from './dto/create-source';
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
}
