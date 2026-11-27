import { Module } from '@nestjs/common';
import { DeclarationsModule } from '../declarations/module';
import { TeachingAssignmentsController } from './controller';
import { TeachingAssignmentsService } from './service';

@Module({
  imports: [DeclarationsModule],
  controllers: [TeachingAssignmentsController],
  providers: [TeachingAssignmentsService],
})
export class TeachingAssignmentsModule {}
