import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ROLE } from '@projectname/shared';
import { Payload, Roles } from '@/common';
import { IPayloadType } from '@/common/decorators/types';
import { CreateUserDto } from './dto/create';
import { UpdateUserDto } from './dto/update';
import { UsersService } from './service';

@Controller('users')
@ApiBearerAuth()
@Roles(ROLE.Admin)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list() {
    return this.usersService.list();
  }

  @Get('tenants')
  listTenants() {
    return this.usersService.listTenants();
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Payload('userId') requesterId: IPayloadType['userId'],
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, requesterId, dto);
  }
}
