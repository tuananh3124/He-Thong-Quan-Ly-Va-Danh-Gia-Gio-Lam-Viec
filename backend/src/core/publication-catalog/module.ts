import { Module } from '@nestjs/common';
import { PublicationCatalogController } from './controller';
import { PublicationCatalogService } from './service';

@Module({
  controllers: [PublicationCatalogController],
  providers: [PublicationCatalogService],
  exports: [PublicationCatalogService],
})
export class PublicationCatalogModule {}
