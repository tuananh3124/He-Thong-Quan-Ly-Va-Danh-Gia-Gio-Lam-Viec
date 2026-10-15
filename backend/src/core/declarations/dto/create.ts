import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class DeclarationAuthorDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Nguyen Van A' })
  authorName: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'MAIN_AUTHOR' })
  roleType: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false, example: '12' })
  userId?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @ApiProperty({ required: false, minimum: 0, maximum: 100 })
  allocationPercentage?: number;
}

export class CreateDeclarationDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'RESEARCH' })
  activityType: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Tên bài nghiên cứu' })
  name: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  @IsOptional()
  @ApiProperty({ required: false, example: 2026 })
  publicationYear?: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false, example: '10.1234/example.2026.1' })
  doi?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '1' })
  academicYearId: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  url?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false, example: '1' })
  sourceId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeclarationAuthorDto)
  @IsOptional()
  @ApiProperty({ type: [DeclarationAuthorDto], required: false })
  authors?: DeclarationAuthorDto[];
}
