import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

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
