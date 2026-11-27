import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdatePublicationSourceDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  classificationId?: string;

  @IsOptional()
  @IsIn(['Q1', 'Q2', 'Q3', 'Q4', null])
  @ApiProperty({ required: false, enum: ['Q1', 'Q2', 'Q3', 'Q4', null] })
  quartile?: string | null;
}
