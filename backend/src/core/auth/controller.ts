import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public, Payload, Roles } from '@/common';
import { LoginUserDto, RefreshTokenDto } from './dto/login';
import { ILoginResponseType, ROLE } from '@projectname/shared';
import { IPayloadType } from '@/common/decorators/types';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('sessions')
  @Public()
  login(@Body() { email, password }: LoginUserDto): Promise<ILoginResponseType> {
    return this.authService.login({
      email,
      password,
    });
  }

  @Post('admin/sessions')
  @Public()
  adminLogin(@Body() { email, password }: LoginUserDto): Promise<ILoginResponseType> {
    return this.authService.login({
      email,
      password,
      isAdmin: true,
    });
  }

  @Post('refresh')
  @Public()
  refresh(@Body() { refreshToken }: RefreshTokenDto): Promise<ILoginResponseType> {
    return this.authService.refresh(refreshToken);
  }

  @Get()
  @ApiBearerAuth()
  @Roles(ROLE.Admin, ROLE.Manager, ROLE.Staff)
  async auth(@Payload('userId') userId: IPayloadType['userId']) {
    return this.authService.auth({
      userId,
    });
  }
}
