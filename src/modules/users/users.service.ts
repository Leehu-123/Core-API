import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import { AuditLogService } from '../../common/services';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, UserFilterDto } from './dto';


// Role groups for scope-based role management
const ROLE_GROUPS: Record<string, string[]> = {
  sale: ['sales', 'sale_admin', 'sale_lead', 'accountant'],
  warehouse: ['thukho', 'viewer', 'warehouse', 'kinhdoanh', 'giacong'],
  shared: ['admin', 'ketoan', 'manager'],
};

function getRolesInScope(scope: string): string[] {
  const scopeRoles = ROLE_GROUPS[scope] || [];
  return [...scopeRoles, ...ROLE_GROUPS.shared];
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(companyId: string, query: UserFilterDto) {
    const where: any = {
      companyId,
      deletedAt: null,
    };

    if (query.teamId) {
      where.teamId = query.teamId;
    }

    if (query.role) {
      where.userRoles = {
        some: {
          role: {
            name: { equals: query.role, mode: 'insensitive' },
          },
        },
      };
    }

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          team: true,
          userRoles: {
            include: { role: true },
          },
        },
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => {
        const userRoles = (user as any).userRoles?.map((ur: any) => ur.role.name) || [];
        return {
          ...this.excludePassword(user),
          roles: userRoles,
        };
      }),
      meta: new PaginationMeta(query.page, query.limit, total),
    };
  }

  async findOne(id: string, companyId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.excludePassword(user);
  }

  async create(companyId: string, userId: string, dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        teamId: dto.teamId || null,
        companyId,
        createdById: userId,
        updatedById: userId,
      },
    });

    // Assign roles if provided
    if (dto.roleNames && dto.roleNames.length > 0) {
      const roles = await this.prisma.role.findMany({
        where: {
          name: { in: dto.roleNames },
          companyId,
        },
      });

      if (roles.length > 0) {
        await this.prisma.userRole.createMany({
          data: roles.map((role) => ({
            userId: user.id,
            roleId: role.id,
          })),
        });
      }
    }

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'CREATED',
      entity: 'User',
      entityId: user.id,
      newValue: JSON.stringify({ email: dto.email,
        username: dto.username, fullName: dto.fullName }),
    });

    return this.excludePassword(user);
  }

  async update(id: string, companyId: string, userId: string, dto: UpdateUserDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const updateData: any = {
      updatedById: userId,
    };

    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.username !== undefined) updateData.username = dto.username;
    if (dto.fullName !== undefined) updateData.fullName = dto.fullName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.teamId !== undefined) updateData.teamId = dto.teamId === "" ? null : dto.teamId;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Update roles if provided (scope-aware)
    if (dto.roleNames !== undefined) {
      if (dto.roleScope) {
        // Scope-aware: only delete roles belonging to this scope
        const scopeRoleNames = getRolesInScope(dto.roleScope);
        const scopeRoles = await this.prisma.role.findMany({
          where: { name: { in: scopeRoleNames }, companyId },
        });
        const scopeRoleIds = scopeRoles.map(r => r.id);
        
        // Delete only roles in this scope
        if (scopeRoleIds.length > 0) {
          await this.prisma.userRole.deleteMany({
            where: { userId: id, roleId: { in: scopeRoleIds } },
          });
        }
      } else {
        // No scope: delete ALL roles (backward compatible)
        await this.prisma.userRole.deleteMany({
          where: { userId: id },
        });
      }

      // Create new role assignments
      if (dto.roleNames.length > 0) {
        const roles = await this.prisma.role.findMany({
          where: {
            name: { in: dto.roleNames },
            companyId,
          },
        });

        if (roles.length > 0) {
          await this.prisma.userRole.createMany({
            data: roles.map((role) => ({
              userId: id,
              roleId: role.id,
            })),
            skipDuplicates: true,
          });
        }
      }
    }

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'UPDATED',
      entity: 'User',
      entityId: id,
      oldValue: JSON.stringify({
        email: existingUser.email,
        fullName: existingUser.fullName,
        isActive: existingUser.isActive,
      }),
      newValue: JSON.stringify({
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        isActive: updatedUser.isActive,
      }),
    });

    return this.excludePassword(updatedUser);
  }

  async remove(id: string, companyId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: userId,
      },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'DEACTIVATED',
      entity: 'User',
      entityId: id,
    });

    return { message: 'User deactivated successfully' };
  }

  private excludePassword<T extends Record<string, any>>(user: T): Omit<T, 'passwordHash'> {
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword as Omit<T, 'passwordHash'>;
  }
}
