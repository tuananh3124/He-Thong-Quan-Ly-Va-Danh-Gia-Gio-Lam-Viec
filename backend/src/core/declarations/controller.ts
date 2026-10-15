import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { createReadStream } from 'node:fs';
import { extname } from 'node:path';
import { ROLE } from '@projectname/shared';
import { Payload, Roles } from '@/common';
import { IPayloadType } from '@/common/decorators/types';
import { CreateDeclarationDto } from './dto/create';
import { ReviewDeclarationDto } from './dto/review';
import { DeclarationsService } from './service';

@Controller('declarations')
@ApiBearerAuth()
@Roles(ROLE.Staff, ROLE.Manager, ROLE.Admin)
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
  @Roles(ROLE.Staff)
  create(@Payload('userId') userId: IPayloadType['userId'], @Body() dto: CreateDeclarationDto) {
    return this.declarationsService.create(userId, dto);
  }

  @Patch(':id')
  @Roles(ROLE.Staff)
  update(
    @Param('id') id: string,
    @Payload('userId') userId: IPayloadType['userId'],
    @Payload('role') role: IPayloadType['role'],
    @Body() dto: CreateDeclarationDto,
  ) {
    return this.declarationsService.update(id, userId, role, dto);
  }

  @Post(':id/evidence')
  @Roles(ROLE.Staff)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        if (file.mimetype !== 'application/pdf' || extname(file.originalname).toLowerCase() !== '.pdf') {
          callback(new BadRequestException('Only PDF evidence is supported'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  uploadEvidence(
    @Param('id') id: string,
    @Payload('userId') userId: IPayloadType['userId'],
    @Payload('role') role: IPayloadType['role'],
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.declarationsService.uploadEvidence(id, userId, role, file);
  }

  @Get(':id/evidence')
  @Roles(ROLE.Staff, ROLE.Manager, ROLE.Admin)
  async downloadEvidence(
    @Param('id') id: string,
    @Payload('userId') userId: IPayloadType['userId'],
    @Payload('role') role: IPayloadType['role'],
  ) {
    const evidence = await this.declarationsService.getEvidence(id, userId, role);
    return new StreamableFile(createReadStream(evidence.path), {
      type: evidence.contentType,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(evidence.originalName)}`,
    });
  }

  @Get(':id')
  @Roles(ROLE.Staff, ROLE.Manager, ROLE.Admin)
  get(
    @Param('id') id: string,
    @Payload('userId') userId: IPayloadType['userId'],
    @Payload('role') role: IPayloadType['role'],
  ) {
    return this.declarationsService.get(id, userId, role);
  }

  @Post(':id/calculate')
  @Roles(ROLE.Staff, ROLE.Admin)
  calculate(
    @Param('id') id: string,
    @Payload('userId') userId: IPayloadType['userId'],
    @Payload('role') role: IPayloadType['role'],
  ) {
    return this.declarationsService.calculate(id, userId, role);
  }

  @Post(':id/submit')
  @Roles(ROLE.Staff, ROLE.Admin)
  submit(
    @Param('id') id: string,
    @Payload('userId') userId: IPayloadType['userId'],
    @Payload('role') role: IPayloadType['role'],
  ) {
    return this.declarationsService.submit(id, userId, role);
  }

  @Patch(':id/review')
  @Roles(ROLE.Manager, ROLE.Admin)
  review(
    @Param('id') id: string,
    @Payload('userId') reviewerId: IPayloadType['userId'],
    @Payload('role') reviewerRole: IPayloadType['role'],
    @Body() dto: ReviewDeclarationDto,
  ) {
    return this.declarationsService.review(id, reviewerId, reviewerRole, dto);
  }
}
