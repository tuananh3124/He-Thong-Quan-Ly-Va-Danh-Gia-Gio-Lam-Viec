import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @ApiPropertyOptional()
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @ApiPropertyOptional()
  academicTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @ApiPropertyOptional()
  degree?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @ApiPropertyOptional()
  managementRole?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @ApiPropertyOptional()
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @ApiPropertyOptional()
  room?: string;
}
