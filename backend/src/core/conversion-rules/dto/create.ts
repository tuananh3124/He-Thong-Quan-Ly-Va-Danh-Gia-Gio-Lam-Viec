import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateConversionRuleDto {
  @IsString()
  @ApiProperty({ example: 'RESEARCH' })
  activityType: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  classificationId?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  academicYearId?: string;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 1200 })
  hours: number;

  @IsInt()
  @IsOptional()
  @ApiProperty({ required: false, default: 0 })
  priority?: number;

  @IsString()
  @IsOptional()
  @ApiProperty({
    required: false,
    description: 'Optional JSON/string condition for future rule evaluation',
  })
  conditions?: string;

  @IsDateString()
  @IsOptional()
  @ApiProperty({ required: false })
  effectiveFrom?: string;

  @IsDateString()
  @IsOptional()
  @ApiProperty({ required: false })
  effectiveTo?: string;
}
