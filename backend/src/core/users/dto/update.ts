import { ApiProperty } from '@nestjs/swagger';
import { ROLE, ROLE_TYPE, STAFF_CATEGORY_TYPE } from '@projectname/shared';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  @ApiProperty({ required: false })
  name?: string;

  @IsEmail()
  @IsOptional()
  @ApiProperty({ required: false })
  email?: string;

  @IsIn(Object.values(ROLE))
  @IsOptional()
  @ApiProperty({ required: false, enum: Object.values(ROLE) })
  role?: ROLE_TYPE;

  @IsIn(['LECTURER', 'RESEARCHER'])
  @IsOptional()
  @ApiProperty({ required: false, enum: ['LECTURER', 'RESEARCHER'] })
  staffCategory?: STAFF_CATEGORY_TYPE | null;

  @IsString()
  @Matches(/^\d+$/)
  @IsOptional()
  @ApiProperty({ required: false })
  tenantId?: string | null;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  academicTitle?: string | null;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  degree?: string | null;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  managementRole?: string | null;
}