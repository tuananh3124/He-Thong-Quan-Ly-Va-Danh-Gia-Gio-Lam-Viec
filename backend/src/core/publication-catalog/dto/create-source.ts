import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePublicationSourceDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Journal of Example Research' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '1' })
  classificationId: string;
}
