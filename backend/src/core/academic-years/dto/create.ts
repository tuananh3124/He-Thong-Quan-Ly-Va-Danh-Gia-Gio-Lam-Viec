import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAcademicYearDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '2025-2026' })
  name: string;

  @IsDateString()
  @ApiProperty({ example: '2025-09-01' })
  startDate: string;

  @IsDateString()
  @ApiProperty({ example: '2026-08-31' })
  endDate: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ required: false, default: true })
  isActive?: boolean;
}
