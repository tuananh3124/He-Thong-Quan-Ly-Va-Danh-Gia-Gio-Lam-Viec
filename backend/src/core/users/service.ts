import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { ROLE, ROLE_TYPE, STAFF_CATEGORY, STAFF_CATEGORY_TYPE } from '@projectname/shared';
import { PrismaService } from '@/common';
import { CreateUserDto } from './dto/create';
import { UpdateUserDto } from './dto/update';

export const roundsOfHashing = 10;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private parseId(value: string, field: string) {
    if (!/^\d+$/.test(value)) throw new BadRequestException(`${field} must be a numeric id`);
    return BigInt(value);
  }

  private serialize(user: any) {
    const { password, ...publicUser } = user;
    return {
      ...publicUser,
      id: user.id.toString(),
      tenantId: user.tenantId?.toString() ?? null,
      tenant: user.tenant
        ? { ...user.tenant, id: user.tenant.id.toString() }
        : user.tenant,
    };
  }

  private validateProfile(role: ROLE_TYPE, category: STAFF_CATEGORY_TYPE | null, tenantId: bigint | null) {
    if (role === ROLE.Staff && !category) {
      throw new BadRequestException('Staff accounts require a lecturer or researcher category');
    }
    if (role !== ROLE.Staff && category) {
      throw new BadRequestException('Only staff accounts can have a staff category');
    }
    if (role !== ROLE.Admin && !tenantId) {
      throw new BadRequestException('Staff and manager accounts must belong to a tenant');
    }
  }

  private async assertTenantExists(tenantId: bigint | null) {
    if (!tenantId) return;
    const tenant = await this.prisma.tenants.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
  }

  async list() {
    const users = await this.prisma.users.findMany({
      include: { tenant: true },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    });
    return users.map((user) => this.serialize(user));
  }

  async listTenants() {
    const tenants = await this.prisma.tenants.findMany({ orderBy: { businessName: 'asc' } });
    return tenants.map((tenant) => ({ ...tenant, id: tenant.id.toString() }));
  }

  async create(dto: CreateUserDto) {
    const tenantId = dto.tenantId ? this.parseId(dto.tenantId, 'tenantId') : null;
    const staffCategory = dto.role === ROLE.Staff ? dto.staffCategory ?? null : null;
    this.validateProfile(dto.role, staffCategory, tenantId);
    await this.assertTenantExists(tenantId);

    try {
      const user = await this.prisma.users.create({
        data: {
          name: dto.name.trim(),
          email: dto.email.trim().toLowerCase(),
          password: await bcrypt.hash(dto.password, roundsOfHashing),
          role: dto.role,
          staffCategory,
          tenantId,
          academicTitle: dto.academicTitle?.trim() || null,
          degree: dto.degree?.trim() || null,
          managementRole: dto.managementRole?.trim() || null,
        },
        include: { tenant: true },
      });
      return this.serialize(user);
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Email is already registered');
      throw error;
    }
  }

  async update(idValue: string, requesterId: string, dto: UpdateUserDto) {
    const id = this.parseId(idValue, 'id');
    const existing = await this.prisma.users.findUnique({
      where: { id },
      include: { tenant: true },
    });
    if (!existing) throw new NotFoundException('User not found');

    const role = dto.role ?? (existing.role as ROLE_TYPE);
    if (existing.id.toString() === requesterId && role !== ROLE.Admin) {
      throw new ForbiddenException('You cannot remove your own administrator role');
    }
    if (existing.role === ROLE.Admin && role !== ROLE.Admin) {
      const administratorCount = await this.prisma.users.count({ where: { role: ROLE.Admin } });
      if (administratorCount <= 1) {
        throw new BadRequestException('The last administrator cannot be demoted');
      }
    }

    const tenantId =
      dto.tenantId === undefined
        ? existing.tenantId
        : dto.tenantId
          ? this.parseId(dto.tenantId, 'tenantId')
          : null;
    const staffCategory =
      role === ROLE.Staff
        ? dto.staffCategory === undefined
          ? (existing.staffCategory as STAFF_CATEGORY_TYPE | null)
          : dto.staffCategory
        : null;
    this.validateProfile(role, staffCategory, tenantId);
    await this.assertTenantExists(tenantId);

    try {
      const user = await this.prisma.users.update({
        where: { id },
        data: {
          name: dto.name?.trim() || undefined,
          email: dto.email?.trim().toLowerCase() || undefined,
          role,
          staffCategory,
          tenantId,
          academicTitle:
            dto.academicTitle === undefined ? undefined : dto.academicTitle?.trim() || null,
          degree: dto.degree === undefined ? undefined : dto.degree?.trim() || null,
          managementRole:
            dto.managementRole === undefined ? undefined : dto.managementRole?.trim() || null,
        },
        include: { tenant: true },
      });
      return this.serialize(user);
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Email is already registered');
      throw error;
    }
  }
}
