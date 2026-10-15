import { ApiProperty } from '@nestjs/swagger';
import { ROLE, ROLE_TYPE, STAFF_CATEGORY_TYPE } from '@projectname/shared';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(1)
  @ApiProperty()
  name: string;

  @IsEmail()
  @ApiProperty()
  email: string;

  @IsString()
  @MinLength(8)
  @ApiProperty({ minLength: 8 })
  password: string;

  @IsIn(Object.values(ROLE))
  @ApiProperty({ enum: Object.values(ROLE) })
  role: ROLE_TYPE;

  @IsIn(['LECTURER', 'RESEARCHER'])
  @IsOptional()
  @ApiProperty({ required: false, enum: ['LECTURER', 'RESEARCHER'] })
  staffCategory?: STAFF_CATEGORY_TYPE;

  @IsString()
  @Matches(/^\d+$/)
  @IsOptional()
  @ApiProperty({ required: false })
  tenantId?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  academicTitle?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  degree?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  managementRole?: string;
}