import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '@/common';
import { getEnv } from '@/utils';
import { ILoginResponseType, ROLE } from '@projectname/shared';
import { UpdateProfileDto } from './dto/profile';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  private createTokens(userId: bigint) {
    const payload = { userId: userId.toString() };

    return {
      accessToken: this.jwtService.sign(payload, {
        secret: getEnv('JWT_SECRET_KEY'),
        expiresIn: '3d',
      }),
      refreshToken: this.jwtService.sign(payload, {
        secret: getEnv('JWT_REFRESH_SECRET_KEY'),
        expiresIn: '7d',
      }),
    };
  }

  private toAuthUser(user: {
    id: bigint;
    name: string;
    email: string;
    role: string;
    staffCategory: string | null;
    academicTitle: string | null;
    degree: string | null;
    managementRole: string | null;
    department: string | null;
    room: string | null;
  }): ILoginResponseType['user'] {
    return {
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      role: user.role as ILoginResponseType['user']['role'],
      staffCategory: user.staffCategory as ILoginResponseType['user']['staffCategory'],
      academicTitle: user.academicTitle,
      degree: user.degree,
      managementRole: user.managementRole,
      department: user.department,
      room: user.room,
    };
  }

  async login(params: {
    email: string;
    password: string;
    isAdmin?: boolean;
  }): Promise<ILoginResponseType> {
    const { email, password, isAdmin } = params;

    const user = await this.prisma.users.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
        role: isAdmin ? ROLE.Admin : { in: [ROLE.Staff, ROLE.Manager] },
      },
    });

    if (!user) {
      throw new UnauthorizedException("Can't find this user, please try again.");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    const tokens = this.createTokens(user.id);

    this.prisma.users
      .update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
      .catch(() => null);

    return { ...tokens, user: this.toAuthUser(user) };
  }

  async refresh(refreshToken: string): Promise<ILoginResponseType> {
    let payload: { userId?: string };

    try {
      payload = (await this.jwtService.verifyAsync(refreshToken, {
        secret: getEnv('JWT_REFRESH_SECRET_KEY'),
      })) as { userId?: string };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!payload.userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.users.findUnique({
      where: { id: BigInt(payload.userId) },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return { ...this.createTokens(user.id), user: this.toAuthUser(user) };
  }

  async auth(params: { userId: string }) {
    const { userId } = params;

    const user = await this.prisma.users.findUnique({
      where: {
        id: BigInt(userId),
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      user: this.toAuthUser(user),
      permissions: [],
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.users.update({
      where: { id: BigInt(userId) },
      data: {
        name: dto.name?.trim(),
        academicTitle: dto.academicTitle?.trim() || null,
        degree: dto.degree?.trim() || null,
        managementRole: dto.managementRole?.trim() || null,
        department: dto.department?.trim() || null,
        room: dto.room?.trim() || null,
      },
    });
    return { user: this.toAuthUser(user), permissions: [] };
  }
}
