import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePublicationSourceDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Journal of Example Research' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '1' })
  classificationId: string;

  @IsOptional()
  @IsIn(['Q1', 'Q2', 'Q3', 'Q4'])
  @ApiProperty({ required: false, enum: ['Q1', 'Q2', 'Q3', 'Q4'] })
  quartile?: string;
}
