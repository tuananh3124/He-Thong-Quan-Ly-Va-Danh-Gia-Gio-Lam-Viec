import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ROLE } from '@projectname/shared';
import { Roles } from '@/common';
import { AcademicYearsService } from './service';
import { CreateAcademicYearDto } from './dto/create';

@Controller('academic-years')
@ApiBearerAuth()
@Roles(ROLE.Staff, ROLE.Admin)
export class AcademicYearsController {
  constructor(private readonly academicYearsService: AcademicYearsService) {}

  @Get()
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  list(@Query('activeOnly') activeOnly?: string) {
    return this.academicYearsService.list(activeOnly === 'true');
  }

  @Post()
  @Roles(ROLE.Admin)
  create(@Body() dto: CreateAcademicYearDto) {
    return this.academicYearsService.create(dto);
  }
}
