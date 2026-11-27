import { BadRequestException, Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { extname } from 'node:path';
import { ROLE } from '@projectname/shared';
import { Payload, Roles } from '@/common';
import { IPayloadType } from '@/common/decorators/types';
import { TeachingAssignmentsService } from './service';

@Controller('teaching-assignments')
@ApiBearerAuth()
@Roles(ROLE.Manager, ROLE.Admin)
export class TeachingAssignmentsController {
  constructor(private readonly service: TeachingAssignmentsService) {}

  @Post('import')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        academicYearId: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();
        const isPdf = extension === '.pdf' && file.mimetype === 'application/pdf';
        const isDocx = extension === '.docx' && [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/octet-stream',
        ].includes(file.mimetype);
        if (!isPdf && !isDocx) {
          callback(new BadRequestException('Chỉ hỗ trợ PDF hoặc Word .docx phân công giảng dạy'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  import(
    @Payload('userId') managerId: IPayloadType['userId'],
    @Payload('role') role: IPayloadType['role'],
    @Body('academicYearId') academicYearId?: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.importDocument(managerId, role, academicYearId, file);
  }
}
