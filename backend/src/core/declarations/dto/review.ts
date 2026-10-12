import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewDeclarationDto {
  @IsIn(['APPROVED', 'REJECTED'])
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  decision: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  reason?: string;
}
