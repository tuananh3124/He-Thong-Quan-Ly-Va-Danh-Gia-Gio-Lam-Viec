import { Module } from '@nestjs/common';
import { ConversionRulesController } from './controller';
import { ConversionRulesService } from './service';

@Module({
  controllers: [ConversionRulesController],
  providers: [ConversionRulesService],
  exports: [ConversionRulesService],
})
export class ConversionRulesModule {}
