import { Module } from '@nestjs/common';
import { DeclarationsController } from './controller';
import { DeclarationsService } from './service';
import { DeclarationRuleEngineService } from './rule-engine.service';

@Module({
  controllers: [DeclarationsController],
  providers: [DeclarationsService, DeclarationRuleEngineService],
  exports: [DeclarationsService, DeclarationRuleEngineService],
})
export class DeclarationsModule {}
