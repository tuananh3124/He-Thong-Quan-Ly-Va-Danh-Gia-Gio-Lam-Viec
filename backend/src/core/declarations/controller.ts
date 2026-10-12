import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ROLE } from '@projectname/shared';
import { Payload, Roles } from '@/common';
import { IPayloadType } from '@/common/decorators/types';
import { CreateDeclarationDto } from './dto/create';
import { ReviewDeclarationDto } from './dto/review';
import { DeclarationsService } from './service';

@Controller('declarations')
@ApiBearerAuth()
@Roles(ROLE.Staff, ROLE.Admin)
export class DeclarationsController {
  constructor(private readonly declarationsService: DeclarationsService) {}

  @Get()
  @ApiQuery({ name: 'status', required: false })
  list(
    @Payload('userId') userId: IPayloadType['userId'],
    @Payload('role') role: IPayloadType['role'],
    @Query('status') status?: string,
  ) {
    return this.declarationsService.list(userId, role, status);
  }

  @Post()
  create(@Payload('userId') userId: IPayloadType['userId'], @Body() dto: CreateDeclarationDto) {
    return this.declarationsService.create(userId, dto);
  }

  @Get(':id')
  get(
    @Param('id') id: string,
    @Payload('userId') userId: IPayloadType['userId'],
    @Payload('role') role: IPayloadType['role'],
  ) {
    return this.declarationsService.get(id, userId, role);
  }

  @Post(':id/calculate')
  calculate(
    @Param('id') id: string,
    @Payload('userId') userId: IPayloadType['userId'],
    @Payload('role') role: IPayloadType['role'],
  ) {
    return this.declarationsService.calculate(id, userId, role);
  }

  @Post(':id/submit')
  submit(
    @Param('id') id: string,
    @Payload('userId') userId: IPayloadType['userId'],
    @Payload('role') role: IPayloadType['role'],
  ) {
    return this.declarationsService.submit(id, userId, role);
  }

  @Patch(':id/review')
  @Roles(ROLE.Admin)
  review(
    @Param('id') id: string,
    @Payload('userId') reviewerId: IPayloadType['userId'],
    @Body() dto: ReviewDeclarationDto,
  ) {
    return this.declarationsService.review(id, reviewerId, dto);
  }
}
