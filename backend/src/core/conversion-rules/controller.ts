import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ROLE } from '@projectname/shared';
import { Roles } from '@/common';
import { CreateConversionRuleDto } from './dto/create';
import { ConversionRulesService } from './service';

@Controller('conversion-rules')
@ApiBearerAuth()
@Roles(ROLE.Staff, ROLE.Admin)
export class ConversionRulesController {
  constructor(private readonly conversionRulesService: ConversionRulesService) {}

  @Get()
  @ApiQuery({ name: 'activityType', required: false })
  @ApiQuery({ name: 'academicYearId', required: false })
  list(
    @Query('activityType') activityType?: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.conversionRulesService.list({ activityType, academicYearId });
  }

  @Post()
  @Roles(ROLE.Admin)
  create(@Body() dto: CreateConversionRuleDto) {
    return this.conversionRulesService.create(dto);
  }
}
