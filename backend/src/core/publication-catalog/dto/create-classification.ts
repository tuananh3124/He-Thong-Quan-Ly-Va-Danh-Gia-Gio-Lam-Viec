import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePublicationClassificationDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'SCOPUS' })
  name: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  description?: string;
}
