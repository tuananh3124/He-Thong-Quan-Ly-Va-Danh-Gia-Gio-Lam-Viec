import { Module } from '@nestjs/common';
import { AcademicYearsController } from './controller';
import { AcademicYearsService } from './service';

@Module({
  controllers: [AcademicYearsController],
  providers: [AcademicYearsService],
  exports: [AcademicYearsService],
})
export class AcademicYearsModule {}
